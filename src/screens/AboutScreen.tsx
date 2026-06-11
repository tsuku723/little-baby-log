import React from "react";

import { NativeStackScreenProps } from "@react-navigation/native-stack";
import Constants from "expo-constants";

import { getAboutTextJa } from "@/content/legal/ja";
import { SettingsStackParamList } from "@/navigation";
import LegalTextScreen from "@/screens/LegalTextScreen";

type Props = NativeStackScreenProps<SettingsStackParamList, "About">;

const AboutScreen: React.FC<Props> = ({ navigation }) => {
  const version = Constants.expoConfig?.version ?? "unknown";
  return (
    <LegalTextScreen
      text={getAboutTextJa(version)}
      title="このアプリについて"
      onBack={() => navigation.goBack()}
    />
  );
};

export default AboutScreen;
