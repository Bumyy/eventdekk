/**
 * API Service for handling API calls to the backend
 */

// Configure API URL based on environment
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Interface for API responses
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Interface for upload response
 */
interface UploadResponse {
  url: string;
}

/**
 * Upload an image to the server
 * @param file - The file to upload
 * @param title - Optional title for the image
 * @returns Promise containing the URL of the uploaded image
 */
export async function uploadImage(file: File, title?: string): Promise<string> {
  if (!file) {
    throw new Error("No file provided");
  }

  // Optional file validation
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }

  // Max size (e.g., 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error(`File size cannot exceed ${maxSize / 1024 / 1024}MB`);
  }

  const formData = new FormData();
  formData.append("image", file);
  formData.append("title", title || file.name);

  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      // Try to get error message from backend response
      let errorMsg = `Image upload failed with status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg;
      } catch (_) {
        /* Ignore if response is not JSON */
      }
      throw new Error(errorMsg);
    }

    const result = (await response.json()) as UploadResponse;
    if (!result.url) {
      throw new Error("Image upload succeeded but did not return a URL.");
    }

    return result.url;
  } catch (error: any) {
    console.error("Image upload failed:", error);
    throw new Error(error.message || "Network error during upload");
  }
}

/**
 * Generic GET request function
 */
export async function getData<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`Error fetching data from ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Generic POST request function
 */
export async function postData<T, R>(endpoint: string, data: T): Promise<R> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`Error posting data to ${endpoint}:`, error);
    throw error;
  }
}
