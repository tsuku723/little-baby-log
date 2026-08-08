import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/constants/colors";
import { resolvePhotoPath } from "@/utils/photo";

type Props = {
  name: string;
  profilePhotoPath?: string;
  size?: number;
};

const UserAvatar: React.FC<Props> = ({ name, profilePhotoPath, size = 40 }) => {
  const borderRadius = size / 2;
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profilePhotoPath]);

  const showImage = Boolean(profilePhotoPath) && !imageError;

  return (
    <View accessibilityLabel={name.trim() || undefined}>
      {showImage ? (
        <Image
          source={{ uri: resolvePhotoPath(profilePhotoPath!) }}
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
    </View>
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
