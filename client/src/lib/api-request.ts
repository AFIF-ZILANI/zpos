import { useAuth } from "@clerk/react";
import { useQuery, useMutation, type UseQueryOptions } from "@tanstack/react-query";

/**
 * A small helper that wraps fetch with JSON parsing + error handling.
 */

// console.log(`${process.env.SERVER_URI}/${process.env.API_VERSION}`);
// if (!process.env.SERVER_URI || !process.env.API_VERSION) {
//   throw Error("Server Base URL is missing!");
// }
// const server_URI = `${process.env.SERVER_URI}/${process.env.API_VERSION}`;
// export const server_URI = "http://localhost:3000/api";


export const server_URI = import.meta.env.VITE_API_URL;



// If you use a custom fetch hook, grab the token like this:
async function fetchJson<T>(
  endpoint: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const isFormData = options.body instanceof FormData;

  const isPlainObject =
    options.body &&
    typeof options.body === "object" &&
    !isFormData &&
    !(options.body instanceof Blob);

  const headers: HeadersInit = {
    ...(isFormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const body = isPlainObject
    ? JSON.stringify(options.body)
    : options.body;

  const res = await fetch(server_URI + endpoint, {
    ...options,
    headers,
    body,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const responseBody = isJson
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    if (
      isJson &&
      responseBody &&
      typeof responseBody === "object" &&
      "message" in responseBody
    ) {
      throw new Error(String((responseBody as { message: unknown }).message));
    }

    throw new Error(`Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return responseBody as T;
}


/* ------------------------- QUERY (GET) ------------------------- */

export function useGetData<T>(
  endpoint: string,
  queryKey?: string[],
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  const { getToken } = useAuth();
  return useQuery<T>({
    queryKey: queryKey ? [...queryKey, endpoint] : [endpoint],
    queryFn: () => fetchJson<T>(endpoint, getToken),
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 1000 * 60 * 5, // ← add this. data stays fresh for 5 min
    ...options,                // caller can still override if needed
  });
}

/* ------------------------- MUTATIONS ------------------------- */

/**
 * POST request
 */
export function usePostData<TInput, TOutput>(endpoint: string) {
  const { getToken } = useAuth();
  return useMutation<TOutput, Error, TInput>({
    mutationKey: [endpoint, "POST"],
    mutationFn: (data: TInput) =>
      fetchJson<TOutput>(endpoint, getToken, {
        method: "POST",
        body: data as RequestInit["body"],
      }),
  });
}

/**
 * PUT request
 */
export function usePutData<TInput, TOutput>(endpoint: string) {
  const { getToken } = useAuth();
  return useMutation<TOutput, Error, TInput>({
    mutationKey: [endpoint, "PUT"],
    mutationFn: (data: TInput) =>
      fetchJson<TOutput>(endpoint, getToken, {
        method: "PUT",
        body: JSON.stringify(data),

      }),
  });
}

/**
 * PATCH request
 */
export function usePatchData<TInput, TOutput>(endpoint: string) {
  const { getToken } = useAuth();
  return useMutation<TOutput, Error, TInput>({
    mutationKey: [endpoint, "PATCH"],
    mutationFn: (data: TInput) =>
      fetchJson<TOutput>(endpoint, getToken, {
        method: "PATCH",
        body: JSON.stringify(data),

      }),
  });
}

/**
 * DELETE request
 */
export function useDeleteData<
  TOutput = unknown,
  TInput = { id: string | number }
>(endpoint: string) {
  const { getToken } = useAuth();
  return useMutation<TOutput, Error, TInput>({
    mutationKey: [endpoint, "DELETE"],
    mutationFn: (data: TInput) =>
      fetchJson<TOutput>(endpoint, getToken, {
        method: "DELETE",
        body: JSON.stringify(data),

      }),
  });
}

/**
 * DELETE Bulk request
 */
export function useDeleteBulkData<
  TOutput = unknown,
  TInput = {
    ids: string[] | number[];
  }
>(endpoint: string) {
  const { getToken } = useAuth();
  return useMutation<TOutput, Error, TInput>({
    mutationKey: [endpoint, "DELETE"],
    mutationFn: (data: TInput) =>
      fetchJson<TOutput>(endpoint, getToken, {
        method: "DELETE",
        body: JSON.stringify(data),

      }),
  });
}
