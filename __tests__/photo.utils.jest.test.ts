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
  pickPhotoAsync,
  saveCroppedPhotoAsync,
  saveCroppedProfilePhotoAsync,
  saveDirectPhotoAsync,
  PhotoPermissionDeniedError,
} from "../src/utils/photo";

describe("photo utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("pickPhotoAsync throws PhotoPermissionDeniedError when permission denied", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({ granted: false });

    await expect(pickPhotoAsync()).rejects.toThrow(PhotoPermissionDeniedError);
  });

  test("pickPhotoAsync returns null when picker canceled", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: [],
    });

    await expect(pickPhotoAsync()).resolves.toBeNull();
  });

  test("pickPhotoAsync returns null width/height when asset dimensions are missing", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/src-no-size.png" }],
    });

    await expect(pickPhotoAsync()).resolves.toEqual({
      uri: "file:///tmp/src-no-size.png",
      width: null,
      height: null,
    });
  });

  test("pickPhotoAsync returns picked uri and dimensions", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///tmp/src.png", width: 3200, height: 1600 }],
    });

    await expect(pickPhotoAsync()).resolves.toEqual({
      uri: "file:///tmp/src.png",
      width: 3200,
      height: 1600,
    });
  });

  const CROP_RECT = { originX: 10, originY: 20, width: 900, height: 600 };

  test("saveCroppedPhotoAsync crops, resizes, creates dir, moves file, and returns destination", async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/out.jpg",
    });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: false,
    });

    const result = await saveCroppedPhotoAsync(
      "file:///tmp/src.png",
      CROP_RECT
    );

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/src.png",
      [{ crop: CROP_RECT }],
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

  test("saveDirectPhotoAsync probes real dimensions, resizes by long edge, creates dir, moves file, and returns destination", async () => {
    (ImageManipulator.manipulateAsync as jest.Mock)
      .mockResolvedValueOnce({
        uri: "file:///tmp/probe.png",
        width: 1000,
        height: 5000,
      })
      .mockResolvedValueOnce({ uri: "file:///tmp/out-direct.jpg" });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: false,
    });

    const result = await saveDirectPhotoAsync("file:///tmp/src-no-size.png");

    expect(ImageManipulator.manipulateAsync).toHaveBeenNthCalledWith(
      1,
      "file:///tmp/src-no-size.png",
      []
    );
    expect(ImageManipulator.manipulateAsync).toHaveBeenNthCalledWith(
      2,
      "file:///tmp/src-no-size.png",
      [{ resize: { height: 1600 } }],
      { compress: 0.75, format: "jpeg" }
    );
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      "file:///doc/achievement-photos/",
      { intermediates: true }
    );
    expect(FileSystem.moveAsync).toHaveBeenCalledTimes(1);
    const arg = (FileSystem.moveAsync as jest.Mock).mock.calls[0][0];
    expect(arg.from).toBe("file:///tmp/out-direct.jpg");
    expect(result).toBe(`achievement-photos/${arg.to.split("/").pop()}`);
  });

  test("saveCroppedPhotoAsync appends resize action when crop is larger than the long-edge limit", async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/out-large.jpg",
    });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
    });

    const largeCropRect = {
      originX: 0,
      originY: 0,
      width: 3200,
      height: 1600,
    };
    await saveCroppedPhotoAsync("file:///tmp/src-large.png", largeCropRect);

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/src-large.png",
      [{ crop: largeCropRect }, { resize: { width: 1600 } }],
      { compress: 0.75, format: "jpeg" }
    );
    expect(FileSystem.makeDirectoryAsync).not.toHaveBeenCalled();
  });

  test("saveCroppedPhotoAsync uses height resize branch for portrait crop rects", async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/out-portrait.jpg",
    });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
    });

    const portraitCropRect = {
      originX: 0,
      originY: 0,
      width: 1600,
      height: 3200,
    };
    await saveCroppedPhotoAsync(
      "file:///tmp/src-portrait.png",
      portraitCropRect
    );

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/src-portrait.png",
      [{ crop: portraitCropRect }, { resize: { height: 1600 } }],
      { compress: 0.75, format: "jpeg" }
    );
  });

  test("saveCroppedProfilePhotoAsync crops, resizes, creates dir, moves file, and returns destination", async () => {
    (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: "file:///tmp/out-avatar.jpg",
    });
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: false,
    });

    const avatarCropRect = {
      originX: 0,
      originY: 0,
      width: 400,
      height: 400,
    };
    const result = await saveCroppedProfilePhotoAsync(
      "file:///tmp/avatar.png",
      avatarCropRect
    );

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///tmp/avatar.png",
      [{ crop: avatarCropRect }],
      { compress: 0.75, format: "jpeg" }
    );
    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
      "file:///doc/profile-photos/",
      { intermediates: true }
    );
    expect(FileSystem.moveAsync).toHaveBeenCalledTimes(1);
    const arg = (FileSystem.moveAsync as jest.Mock).mock.calls[0][0];
    expect(arg.from).toBe("file:///tmp/out-avatar.jpg");
    expect(arg.to.startsWith("file:///doc/profile-photos/profile-")).toBe(true);
    expect(result).toBe(`profile-photos/${arg.to.split("/").pop()}`);
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
