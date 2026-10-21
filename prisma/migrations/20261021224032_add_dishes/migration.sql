-- CreateTable
CREATE TABLE "dishes" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "restaurantId" INTEGER NOT NULL,

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
