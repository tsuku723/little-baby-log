import { NavigatorScreenParams } from "@react-navigation/native";

// Navigation type definitions. Keep RootStack in sync with flow requirements.
export type RootStackParamList = {
  MainTabs: undefined;
  RecordInput:
    | {
        recordId?: string; // edit-only
        isoDate?: string; // initial date for new record
        from?: "today" | "list";
      }
    | undefined;
  RecordDetail:
    | {
        recordId: string;
        isoDate?: string;
        from: "today" | "list";
      }
    | undefined;
};

export type CalendarStackParamList = {
  Calendar: undefined;
  Today: {
    isoDate: string;
  };
};

export type RecordListStackParamList = {
  AchievementList: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  ProfileManager: undefined;
  ProfileEdit:
    | {
        profileId?: string;
        // 別タブのアバターから開いた場合、保存/削除後に戻るタブ
        returnTo?: "CalendarStack" | "RecordListStack";
      }
    | undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  Terms: undefined;
  OpenSourceLicenses: undefined;
  Contact: undefined;
};

export type TabParamList = {
  CalendarStack: NavigatorScreenParams<CalendarStackParamList>;
  RecordListStack: NavigatorScreenParams<RecordListStackParamList>;
  SettingsStack: NavigatorScreenParams<SettingsStackParamList>;
};
