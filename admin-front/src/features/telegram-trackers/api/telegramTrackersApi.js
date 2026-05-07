import { baseApi } from "../../../shared/api/baseApi";

export const telegramTrackersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTelegramTrackers: builder.query({
      query: () => ({
        url: "/api/admin/telegram-trackers",
        method: "GET",
      }),
      transformResponse: (response) =>
        (response.data ?? []).map((tracker) => ({
          id: tracker.id,
          label: tracker.label,
          isActive: tracker.is_active,
          isRunning: tracker.is_running,
          createdAt: tracker.created_at,
          updatedAt: tracker.updated_at,
        })),
      providesTags: ["TelegramTrackers"],
    }),
    startTelegramTrackerAuth: builder.mutation({
      query: (payload) => ({
        url: "/api/admin/telegram-trackers/auth/phone",
        method: "POST",
        body: payload,
      }),
    }),
    verifyTelegramTrackerCode: builder.mutation({
      query: (payload) => ({
        url: "/api/admin/telegram-trackers/auth/code",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["TelegramTrackers"],
    }),
    verifyTelegramTrackerPassword: builder.mutation({
      query: (payload) => ({
        url: "/api/admin/telegram-trackers/auth/password",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: ["TelegramTrackers"],
    }),
    deleteTelegramTracker: builder.mutation({
      query: (id) => ({
        url: `/api/admin/telegram-trackers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TelegramTrackers", "TelegramMessages"],
    }),
    restartTelegramTracker: builder.mutation({
      query: (id) => ({
        url: `/api/admin/telegram-trackers/${id}/restart`,
        method: "POST",
      }),
      invalidatesTags: ["TelegramTrackers", "TelegramMessages"],
    }),
  }),
});

export const {
  useGetTelegramTrackersQuery,
  useStartTelegramTrackerAuthMutation,
  useVerifyTelegramTrackerCodeMutation,
  useVerifyTelegramTrackerPasswordMutation,
  useDeleteTelegramTrackerMutation,
  useRestartTelegramTrackerMutation,
} = telegramTrackersApi;
