export type ServerUrlType = "bitwarden.com" | "bitwarden.eu" | "self-hosted";

export type SetupForm = {
  clientId: string;
  clientSecret: string;
  serverUrlType: ServerUrlType;
  serverUrl: string;
  startDate: string;
  index: string;
  indexOverride: string;
};
