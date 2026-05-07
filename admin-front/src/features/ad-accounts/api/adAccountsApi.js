import { baseApi } from "../../../shared/api/baseApi";

export const adAccountsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdAccounts: builder.query({
      query: () => ({
        url: "/api/admin/ad-accounts",
        method: "GET",
      }),
      transformResponse: (response) =>
        (response.data ?? []).map((account) => ({
          id: account.id,
          platform: account.platform,
          name: account.name,
          pixelId: account.pixel_id,
          accessKey: account.access_key,
          createdAt: account.created_at,
        })),
      providesTags: ["AdAccounts"],
    }),
    createAdAccount: builder.mutation({
      query: (payload) => ({
        url: "/api/admin/ad-accounts",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["AdAccounts"],
    }),
    deleteAdAccount: builder.mutation({
      query: (id) => ({
        url: `/api/admin/ad-accounts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AdAccounts"],
    }),
  }),
});

export const {
  useGetAdAccountsQuery,
  useCreateAdAccountMutation,
  useDeleteAdAccountMutation,
} = adAccountsApi;
