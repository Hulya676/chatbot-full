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
        // 1. Mesaj gönderme
        sendMessage: builder.mutation({
            query: (messages) => ({
                url: 'chat',
                method: 'POST',
                headers: {
                    "x-ai-provider": "gemini"
                },
                body: {
                    message: messages[messages.length - 1].content
                },
            }),
            transformResponse: (response) => response.reply || 'Yanıt yok',
        }),

        // 2. Tüm hastaneleri al
        getHospitals: builder.query({
            query: () => 'api/hospitals',
        }),

        // 3. Seçilen hastanenin branşlarını al
        getBranchesByHospitalId: builder.query({
            query: (hospitalId) => `api/hospitals/${hospitalId}/branches`,
        }),

        // 4. Seçilen branşın doktorlarını al
        getDoctorsByBranchId: builder.query({
            query: (branchId) => `api/branches/${branchId}/doctors`,
        }),

        // 5. Seçilen doktorun müsait saatlerini al
        getTimesByDoctorId: builder.query({
            query: (doctorId) => `api/doctors/${doctorId}/times`,
        }),
    }),
});

export const {
    useSendMessageMutation,
    useGetHospitalsQuery,
    useGetBranchesByHospitalIdQuery,
    useGetDoctorsByBranchIdQuery,
    useGetTimesByDoctorIdQuery
} = localApi;
