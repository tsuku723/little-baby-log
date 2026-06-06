import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "@/constants/colors";

type Props = {
  name: string;
  profilePhotoPath?: string;
  onPress: () => void;
  size?: number;
};

const UserAvatar: React.FC<Props> = ({
  name,
  profilePhotoPath,
  onPress,
  size = 40,
}) => {
  const borderRadius = size / 2;
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profilePhotoPath]);

  const label = name.trim()
    ? `${name.trim()}のプロフィールを編集`
    : "プロフィールを編集";

  const showImage = Boolean(profilePhotoPath) && !imageError;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {showImage ? (
        <Image
          source={{ uri: profilePhotoPath }}
          style={{ width: size, height: size, borderRadius }}
          onError={() => setImageError(true)}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius },
          ]}
        >
          <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
            {name.trim() ? name.trim()[0] : "?"}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: COLORS.highlightToday,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
});

export default UserAvatar;
