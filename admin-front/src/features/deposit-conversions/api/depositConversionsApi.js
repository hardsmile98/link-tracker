import { baseApi } from "../../../shared/api/baseApi";

function buildDepositConversionsUrl(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.limit != null && params.limit !== "") {
    searchParams.set("limit", String(params.limit));
  }
  if (params.telegramUserId != null && params.telegramUserId !== "") {
    searchParams.set("telegram_user_id", String(params.telegramUserId));
  }
  const qs = searchParams.toString();
  return qs ? `/api/admin/deposit-conversions?${qs}` : "/api/admin/deposit-conversions";
}

export const depositConversionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDepositConversions: builder.query({
      query: (params = {}) => ({
        url: buildDepositConversionsUrl(params),
        method: "GET",
      }),
      transformResponse: (response) =>
        (response.data ?? []).map((row) => ({
          id: row.id,
          attributionId: row.attribution_id,
          clickId: row.click_id,
          telegramUserId: row.telegram_user_id,
          amountUsd: row.amount_usd,
          createdAt: row.created_at,
          chatThread: row.chat_thread
            ? {
                trackerId: row.chat_thread.tracker_id,
                peerType: row.chat_thread.peer_type,
                peerId: row.chat_thread.peer_id,
              }
            : null,
        })),
      providesTags: ["DepositConversions"],
    }),
    createDepositConversion: builder.mutation({
      query: ({ telegramUserId, amountUsd }) => ({
        url: "/api/admin/deposit-conversions",
        method: "POST",
        body: {
          telegram_user_id: String(telegramUserId),
          amount_usd: amountUsd,
        },
      }),
      transformResponse: (response) => {
        const row = response.data;
        return {
          id: row.id,
          attributionId: row.attribution_id,
          clickId: row.click_id,
          telegramUserId: row.telegram_user_id,
          amountUsd: row.amount_usd,
          createdAt: row.created_at,
        };
      },
      invalidatesTags: ["DepositConversions"],
    }),
  }),
});

export const {
  useCreateDepositConversionMutation,
  useGetDepositConversionsQuery,
} = depositConversionsApi;
