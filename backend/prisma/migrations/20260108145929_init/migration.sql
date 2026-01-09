-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "real_name" TEXT,
    "phone" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "customers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "wechat" TEXT,
    "source" TEXT NOT NULL,
    "tags" TEXT,
    "notes" TEXT,
    "first_visit_date" DATETIME,
    "last_visit_date" DATETIME,
    "total_spent" DECIMAL NOT NULL DEFAULT 0,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "accommodation_places" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "distance" DECIMAL,
    "duration" INTEGER,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "projects" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "unit" TEXT NOT NULL,
    "season" TEXT,
    "duration" INTEGER NOT NULL,
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "packages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "min_people" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "package_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "package_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "package_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "package_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_number" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "accommodation_place_id" INTEGER NOT NULL,
    "room_number" TEXT,
    "package_id" INTEGER,
    "order_date" DATETIME NOT NULL,
    "visit_date" DATETIME NOT NULL,
    "people_count" INTEGER NOT NULL,
    "total_amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_accommodation_place_id_fkey" FOREIGN KEY ("accommodation_place_id") REFERENCES "accommodation_places" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "order_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "scheduled_time_start" DATETIME,
    "scheduled_time_end" DATETIME,
    "coach_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_items_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "plate_number" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shuttle_schedules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "batch_name" TEXT NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "departure_time" DATETIME NOT NULL,
    "return_time" DATETIME,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shuttle_schedules_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shuttle_schedules_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shuttle_stops" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "schedule_id" INTEGER NOT NULL,
    "accommodation_place_id" INTEGER NOT NULL,
    "stop_order" INTEGER NOT NULL,
    "passenger_count" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shuttle_stops_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "shuttle_schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shuttle_stops_accommodation_place_id_fkey" FOREIGN KEY ("accommodation_place_id") REFERENCES "accommodation_places" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "coaches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "specialties" TEXT,
    "status" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "daily_schedules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "coach_id" INTEGER,
    "participant_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "daily_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "daily_schedules_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "coaches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "xiaohongshu_notes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "publish_date" DATETIME,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "collects" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "images" TEXT,
    "xiaohongshu_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_source_idx" ON "customers"("source");

-- CreateIndex
CREATE INDEX "customers_last_visit_date_idx" ON "customers"("last_visit_date");

-- CreateIndex
CREATE INDEX "customers_created_at_idx" ON "customers"("created_at");

-- CreateIndex
CREATE INDEX "accommodation_places_type_idx" ON "accommodation_places"("type");

-- CreateIndex
CREATE INDEX "projects_season_idx" ON "projects"("season");

-- CreateIndex
CREATE INDEX "projects_is_active_idx" ON "projects"("is_active");

-- CreateIndex
CREATE INDEX "package_items_package_id_idx" ON "package_items"("package_id");

-- CreateIndex
CREATE INDEX "package_items_project_id_idx" ON "package_items"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_accommodation_place_id_idx" ON "orders"("accommodation_place_id");

-- CreateIndex
CREATE INDEX "orders_package_id_idx" ON "orders"("package_id");

-- CreateIndex
CREATE INDEX "orders_order_date_idx" ON "orders"("order_date");

-- CreateIndex
CREATE INDEX "orders_visit_date_idx" ON "orders"("visit_date");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_payment_status_idx" ON "orders"("payment_status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_project_id_idx" ON "order_items"("project_id");

-- CreateIndex
CREATE INDEX "order_items_coach_id_idx" ON "order_items"("coach_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "vehicles"("plate_number");

-- CreateIndex
CREATE INDEX "shuttle_schedules_date_idx" ON "shuttle_schedules"("date");

-- CreateIndex
CREATE INDEX "shuttle_schedules_vehicle_id_idx" ON "shuttle_schedules"("vehicle_id");

-- CreateIndex
CREATE INDEX "shuttle_schedules_driver_id_idx" ON "shuttle_schedules"("driver_id");

-- CreateIndex
CREATE INDEX "shuttle_stops_schedule_id_idx" ON "shuttle_stops"("schedule_id");

-- CreateIndex
CREATE INDEX "shuttle_stops_accommodation_place_id_idx" ON "shuttle_stops"("accommodation_place_id");

-- CreateIndex
CREATE INDEX "daily_schedules_date_idx" ON "daily_schedules"("date");

-- CreateIndex
CREATE INDEX "daily_schedules_project_id_idx" ON "daily_schedules"("project_id");

-- CreateIndex
CREATE INDEX "daily_schedules_coach_id_idx" ON "daily_schedules"("coach_id");

-- CreateIndex
CREATE INDEX "xiaohongshu_notes_status_idx" ON "xiaohongshu_notes"("status");

-- CreateIndex
CREATE INDEX "xiaohongshu_notes_publish_date_idx" ON "xiaohongshu_notes"("publish_date");

-- CreateIndex
CREATE INDEX "xiaohongshu_notes_created_at_idx" ON "xiaohongshu_notes"("created_at");
