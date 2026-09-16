import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Achievement } from "@/models/dataModels";
import { ensureFileExistsAsync, resolvePhotoPath } from "@/utils/photo";
import { COLORS } from "@/constants/colors";

type RecordCardProps = {
  item: Achievement;
  onPress: () => void;
};

const RecordCard: React.FC<RecordCardProps> = ({ item, onPress }) => {
  const [resolvedPhoto, setResolvedPhoto] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    void ensureFileExistsAsync(item.photoPath ?? null).then((path) => {
      if (mounted) setResolvedPhoto(path);
    });
    return () => {
      mounted = false;
    };
  }, [item.photoPath]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title || "(タイトルなし)"}
        </Text>
        <Text style={styles.cardDate}>{item.date.replace(/-/g, "/")}</Text>
      </View>
      <View style={styles.cardThumb}>
        {resolvedPhoto ? (
          <Image
            source={{ uri: resolvePhotoPath(resolvedPhoto) }}
            style={styles.cardThumbImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardThumbPlaceholder}>
            <Ionicons
              name="camera-outline"
              size={24}
              color={COLORS.textSecondary}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cardThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
  },
  cardThumbImage: {
    width: "100%",
    height: "100%",
  },
  cardThumbPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.cellDimmed,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default RecordCard;
