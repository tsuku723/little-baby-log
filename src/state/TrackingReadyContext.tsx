import React, { createContext, useContext } from "react";

const TrackingReadyContext = createContext(false);

export const TrackingReadyProvider: React.FC<{
  value: boolean;
  children: React.ReactNode;
}> = ({ value, children }) => (
  <TrackingReadyContext.Provider value={value}>
    {children}
  </TrackingReadyContext.Provider>
);

export const useTrackingReady = (): boolean => useContext(TrackingReadyContext);
