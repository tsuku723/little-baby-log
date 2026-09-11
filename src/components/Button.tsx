import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";
import { COLORS } from "../constants/colors";

type Variant = "primary" | "secondary" | "danger";

type ButtonProps = TouchableOpacityProps & {
  title: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const Button: React.FC<ButtonProps> = ({
  title,
  variant = "secondary",
  loading = false,
  disabled,
  style,
  textStyle,
  children,
  ...rest
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        variant === "primary" && styles.primary,
        variant === "danger" && styles.danger,
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      accessibilityRole="button"
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary" || variant === "danger"
              ? COLORS.surface
              : COLORS.textPrimary
          }
        />
      ) : (
        <>
          <Text
            style={[
              styles.text,
              (variant === "primary" || variant === "danger") &&
                styles.textOnAccent,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {children}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.filterBackground,
  },
  primary: {
    backgroundColor: COLORS.accentGreen,
    borderColor: COLORS.accentGreen,
  },
  danger: {
    backgroundColor: COLORS.sunday,
    borderColor: COLORS.sunday,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  textOnAccent: {
    color: COLORS.surface,
  },
});

export default Button;
