/*
  Warnings:

  - You are about to drop the column `serviceType` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `car_wash_station_id` on the `TimeSlot` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `TimeSlot` table. All the data in the column will be lost.
  - You are about to drop the column `order_id` on the `payment_transactions` table. All the data in the column will be lost.
  - Added the required column `car_wash_station_id` to the `Availability` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_time` to the `TimeSlot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `TimeSlot` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TimeSlot" DROP CONSTRAINT "TimeSlot_car_wash_station_id_fkey";

-- AlterTable
ALTER TABLE "Availability" ADD COLUMN     "car_wash_station_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "serviceType",
ALTER COLUMN "carType" DROP NOT NULL,
ALTER COLUMN "bookingDate" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending';

-- AlterTable
ALTER TABLE "CarWashStation" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "TimeSlot" DROP COLUMN "car_wash_station_id",
DROP COLUMN "time",
ADD COLUMN     "end_time" TEXT NOT NULL,
ADD COLUMN     "start_time" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payment_transactions" DROP COLUMN "order_id",
ADD COLUMN     "booking_id" TEXT,
ALTER COLUMN "type" SET DEFAULT 'booking';

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarWashStation" ADD CONSTRAINT "CarWashStation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_car_wash_station_id_fkey" FOREIGN KEY ("car_wash_station_id") REFERENCES "CarWashStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
