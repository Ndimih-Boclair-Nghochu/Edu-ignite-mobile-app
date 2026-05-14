import * as ImagePicker from "expo-image-picker";

export type UploadableFile =
  | File
  | {
      uri: string;
      name: string;
      type: string;
    };

function buildUploadName(fileName?: string | null) {
  const trimmed = fileName?.trim();
  if (trimmed) {
    return trimmed;
  }
  return `upload-${Date.now()}.jpg`;
}

export async function pickImageUpload(options?: {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}): Promise<UploadableFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required to upload an image.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: "images",
    allowsEditing: options?.allowsEditing ?? true,
    aspect: options?.aspect,
    quality: options?.quality ?? 0.85,
  });

  if (result.canceled || !result.assets?.length) {
    return null;
  }

  const asset = result.assets[0];
  if (asset.file) {
    return asset.file;
  }

  return {
    uri: asset.uri,
    name: buildUploadName(asset.fileName),
    type: asset.mimeType || "image/jpeg",
  };
}
