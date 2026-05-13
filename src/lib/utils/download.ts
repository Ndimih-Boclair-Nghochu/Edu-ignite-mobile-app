import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API } from "@/lib/api/endpoints";
import { BASE_URL, getAccessToken, hydrateTokens } from "@/lib/api/client";

function buildQuery(params?: Record<string, string | number | undefined | null>) {
  if (!params) {
    return "";
  }

  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join("&");

  return query ? `?${query}` : "";
}

export async function downloadSchoolFeeReportPdf(
  params?: Record<string, string | number | undefined | null>
) {
  await hydrateTokens();
  const token = getAccessToken();
  if (!token) {
    throw new Error("You need to be signed in before downloading reports.");
  }

  const rootDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!rootDirectory) {
    throw new Error("This device does not expose a writable cache directory.");
  }

  const fileUri = `${rootDirectory}eduignite-school-fees-${Date.now()}.pdf`;
  const url = `${BASE_URL}${API.FEES.SCHOOL_FEE_REPORT_PDF}${buildQuery(params)}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: "Share school fee report",
    });
  }

  return result.uri;
}
