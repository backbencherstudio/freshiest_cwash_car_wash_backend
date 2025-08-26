export class Booking {
    id: string;
    user_id: string;
    service_id: string;
    car_wash_station_id: string;
    time_slot_id: string;
    carType: string;
    serviceType: string;
    bookingDate: Date;
    total_amount?: string;
    status: string;
    payment_status?: string;
    payment_raw_status?: string;
    paid_amount?: string;
    paid_currency?: string;
    payment_provider?: string;
    payment_reference_number?: string;
    payment_provider_charge_type?: string;
    payment_provider_charge?: string;
    createdAt: Date;
    updatedAt: Date;
}
