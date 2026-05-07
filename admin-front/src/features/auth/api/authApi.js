import { baseApi } from "../../../shared/api/baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query({
      query: () => ({
        url: "/api/admin/me",
        method: "GET",
      }),
      transformResponse: (response) => response.data,
      providesTags: ["Auth"],
    }),
    login: builder.mutation({
      query: (payload) => ({
        url: "/api/admin/login",
        method: "POST",
        body: payload,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ["Auth"],
    }),
    logout: builder.mutation({
      query: () => ({
        url: "/api/admin/logout",
        method: "POST",
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ["Auth", "RedirectRules", "AdAccounts"],
    }),
  }),
});

export const { useGetMeQuery, useLoginMutation, useLogoutMutation } = authApi;
