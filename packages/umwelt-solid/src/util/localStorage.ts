import { Storage } from 'versioned-storage';

const STORAGE_KEY = 'umwelt';
const STORAGE_VERSION = 1; // write migrations before bumping

type UmweltUserSettings = {
  muted: boolean;
  speakAxisTicks: boolean;
  speechRate: number;
  playbackRate: number;
};

const defaultSettings: UmweltUserSettings = {
  muted: false,
  speakAxisTicks: true,
  speechRate: 50,
  playbackRate: 1,
};

const userStorage = () => {
  // add migrations here if we ever bump the storage version
  return new Storage<UmweltUserSettings>(STORAGE_KEY, STORAGE_VERSION);
};

export const getUserSettings = () => userStorage().read();
export const setUserSettings = (settings: Partial<UmweltUserSettings>) => {
  const currentSettings = getUserSettings() || defaultSettings;
  userStorage().write({
    ...currentSettings,
    ...settings,
  });
};
