import { baseApi } from "../../../shared/api/baseApi";

export const redirectRulesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRedirectRules: builder.query({
      query: () => ({
        url: "/api/admin/redirect-rules",
        method: "GET",
      }),
      transformResponse: (response) =>
        (response.data ?? []).map((rule) => ({
          id: rule.id,
          name: rule.name,
          referrer: rule.referrer,
          redirectUrl: rule.redirect_url,
        })),
      providesTags: ["RedirectRules"],
    }),
    createRedirectRule: builder.mutation({
      query: (payload) => ({
        url: "/api/admin/redirect-rules",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["RedirectRules"],
    }),
    updateRedirectRule: builder.mutation({
      query: ({ id, payload }) => ({
        url: `/api/admin/redirect-rules/${id}`,
        method: "PATCH",
        body: payload,
      }),
      invalidatesTags: ["RedirectRules"],
    }),
    deleteRedirectRule: builder.mutation({
      query: (id) => ({
        url: `/api/admin/redirect-rules/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["RedirectRules"],
    }),
  }),
});

export const {
  useGetRedirectRulesQuery,
  useCreateRedirectRuleMutation,
  useUpdateRedirectRuleMutation,
  useDeleteRedirectRuleMutation,
} = redirectRulesApi;
