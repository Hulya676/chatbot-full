import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';


export const localApi = createApi({
    reducerPath: 'localApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'http://localhost:3000/',
        prepareHeaders: (headers) => {
            headers.set('Content-Type', 'application/json');
            return headers;
        },
    }),
    endpoints: (builder) => ({
        sendMessage: builder.mutation({
            query: (messages) => ({
                url: 'chat', // http://localhost:3000/chat
                method: 'POST',
                headers: {
                    "x-ai-provider": "gemini"
                },
                body: {
                    message: messages[messages.length - 1].content
                },
            }),
            transformResponse: (response) => {
                // Geri dönen yanıt direkt string ise:
                return response.reply || 'Yanıt yok';
            },
        }),
    }),
});

export const { useSendMessageMutation } = localApi;
