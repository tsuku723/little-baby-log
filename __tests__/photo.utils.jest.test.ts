jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///doc/",
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  moveAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import {
  deleteIfExistsAsync,
  ensureFileExistsAsync,
  pickAndSavePhotoAsync,
  PhotoPermissionDeniedError,
} from "../src/utils/photo";

describe("photo utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("pickAndSavePhotoAsync throws PhotoPermissionDeniedError when permission denied", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({ granted: false });

    await expect(pickAndSavePhotoAsync()).rejects.toThrow(
      PhotoPermissionDeniedError
    );
  });

  test("pickAndSavePhotoAsync returns null when picker canceled", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    });

    await expect(pickAndSavePhotoAsync()).resolves.toBeNull();
    expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
  });

  test("pickAndSavePhotoAsync resizes, creates dir, moves file, and returns destination", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/src.png", width: 3200, height: 1600 }],
    });
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/out.jpg",
    });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

    const result = await pickAndSavePhotoAsync();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/src.png",
      [{ resize: { width: 1600 } }],
      { compress: 0.75, format: "jpeg" }
    );
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      "file:///doc/achievement-photos/",
      { intermediates: true }
    );
    expect(FileSystem.moveAsync).toHaveBeenCalledTimes(1);
    const arg = (FileSystem.moveAsync as jest.Mock).mock.calls[0][0];
    expect(arg.from).toBe("file:///tmp/out.jpg");
    expect(
      arg.to.startsWith("file:///doc/achievement-photos/achievement-")
    ).toBe(true);
    expect(arg.to.endsWith(".jpg")).toBe(true);
    expect(result).toBe(`achievement-photos/${arg.to.split("/").pop()}`);
  });

  const SAFE_PATH = "achievement-photos/x.jpg";

  test("ensureFileExistsAsync returns null for empty path", async () => {
    await expect(ensureFileExistsAsync(undefined)).resolves.toBeNull();
    await expect(ensureFileExistsAsync(null)).resolves.toBeNull();
    expect(FileSystem.getInfoAsync).not.toHaveBeenCalled();
  });

  test("ensureFileExistsAsync returns null when file does not exist", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
    await expect(ensureFileExistsAsync(SAFE_PATH)).resolves.toBeNull();
  });

  test("ensureFileExistsAsync warns and returns null when fs check throws", async () => {
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error("boom"));

    await expect(ensureFileExistsAsync(SAFE_PATH)).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  test("ensureFileExistsAsync warns and returns null for unsafe path", async () => {
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    await expect(
      ensureFileExistsAsync("../../databases/RKStorage")
    ).resolves.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      "Unsafe photoPath rejected:",
      "../../databases/RKStorage"
    );
    expect(FileSystem.getInfoAsync).not.toHaveBeenCalled();
  });

  test("deleteIfExistsAsync does nothing for empty path", async () => {
    await deleteIfExistsAsync(undefined);
    await deleteIfExistsAsync(null);
    expect(FileSystem.getInfoAsync).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  test("deleteIfExistsAsync deletes when file exists", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
    await deleteIfExistsAsync(SAFE_PATH);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "file:///doc/achievement-photos/x.jpg",
      { idempotent: true }
    );
  });

  test("deleteIfExistsAsync warns when fs check throws", async () => {
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(new Error("nope"));

    await expect(deleteIfExistsAsync(SAFE_PATH)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  test("deleteIfExistsAsync warns and does nothing for unsafe path", async () => {
    const warnSpy = jest
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    await deleteIfExistsAsync("../../databases/RKStorage");
    expect(warnSpy).toHaveBeenCalledWith(
      "Unsafe photoPath rejected:",
      "../../databases/RKStorage"
    );
    expect(FileSystem.getInfoAsync).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  test("pickAndSavePhotoAsync uses empty resize actions when long edge is small and skips directory creation when exists", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/src-small.png", width: 1200, height: 800 }],
    });
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/out-small.jpg",
    });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

    await pickAndSavePhotoAsync();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/src-small.png",
      [],
      { compress: 0.75, format: "jpeg" }
    );
    expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
  });

  test("pickAndSavePhotoAsync falls back to width resize when asset dimensions are missing", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/src-no-size.png" }],
    });
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/out-no-size.jpg",
    });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

    await pickAndSavePhotoAsync();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/src-no-size.png",
      [{ resize: { width: 1600 } }],
      { compress: 0.75, format: "jpeg" }
    );
  });

  test("pickAndSavePhotoAsync uses height resize branch for portrait images", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///tmp/src-portrait.png", width: 1600, height: 3200 },
      ],
    });
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/out-portrait.jpg",
    });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

    await pickAndSavePhotoAsync();

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/src-portrait.png",
      [{ resize: { height: 1600 } }],
      { compress: 0.75, format: "jpeg" }
    );
  });

  test("ensureFileExistsAsync returns original path when file exists", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

    await expect(ensureFileExistsAsync(SAFE_PATH)).resolves.toBe(SAFE_PATH);
  });

  test("deleteIfExistsAsync skips delete when file does not exist", async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });

    await deleteIfExistsAsync(SAFE_PATH);
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });
});
