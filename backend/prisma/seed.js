const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据...\n');

  // 1. 创建管理员用户
  console.log('1. 创建管理员用户...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hashedPassword,
      role: 'admin',
      realName: '系统管理员',
      phone: '13800138000',
    },
  });
  console.log(`   [OK] 管理员用户: ${admin.username}`);

  // 2. 创建住宿地点
  console.log('\n2. 创建住宿地点...');
  const accommodationData = [
    { name: '营地自营宾馆', type: 'self', address: '长白山景区内', distance: 0, duration: 0 },
    { name: '长白山国际度假村', type: 'external', address: '长白山景区南坡', distance: 5, duration: 15 },
    { name: '二道白河镇中心酒店区', type: 'external', address: '二道白河镇中心街', distance: 8, duration: 20 },
    { name: '万达度假区', type: 'external', address: '长白山万达度假区', distance: 12, duration: 30 },
  ];

  const accommodations = [];
  for (const data of accommodationData) {
    const place = await prisma.accommodationPlace.upsert({
      where: { id: accommodationData.indexOf(data) + 1 },
      update: data,
      create: data,
    });
    accommodations.push(place);
    console.log(`   [OK] ${place.name}`);
  }

  // 3. 创建项目
  console.log('\n3. 创建项目...');
  const projectData = [
    { name: '石板烧烤', description: '长白山特色石板烤肉', price: 98, unit: 'per_person', season: 'all', duration: 120, capacity: 50, sortOrder: 1 },
    { name: '雪上滑梯乐园', description: '多条滑道，适合全家', price: 68, unit: 'per_person', season: 'winter', duration: 90, capacity: null, sortOrder: 2 },
    { name: '冰钓体验', description: '专业教练指导，提供工具', price: 128, unit: 'per_person', season: 'winter', duration: 120, capacity: 30, sortOrder: 3 },
    { name: '冬日丛林穿越', description: '探索雪中森林，观赏雾凇', price: 88, unit: 'per_person', season: 'winter', duration: 60, capacity: 30, sortOrder: 4 },
    { name: '烤棉花糖', description: '篝火旁互动，温馨体验', price: 20, unit: 'per_person', season: 'all', duration: 30, capacity: null, sortOrder: 5 },
    { name: '烤地瓜', description: '冬日传统美食', price: 15, unit: 'per_person', season: 'all', duration: 30, capacity: null, sortOrder: 6 },
  ];

  const projects = [];
  for (const data of projectData) {
    const project = await prisma.project.upsert({
      where: { id: projectData.indexOf(data) + 1 },
      update: data,
      create: data,
    });
    projects.push(project);
    console.log(`   [OK] ${project.name} - ¥${project.price}`);
  }

  // 4. 创建套餐
  console.log('\n4. 创建套餐...');
  // 春节特殊价格配置
  const springFestivalPricing = JSON.stringify({
    dates: ['2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04'],
    price: 398,
    childPrice: 268,
    label: '春节价'
  });

  const packageData = [
    { name: '单项体验', description: '任选1个项目', price: 98, childPrice: 68, minPeople: 1, sortOrder: 1, showInBookingForm: true },
    { name: '双项套餐', description: '任选2个项目', price: 168, childPrice: 118, minPeople: 1, sortOrder: 2, showInBookingForm: true },
    { name: '冰雪乐园套餐', description: '冰钓+雪上滑梯+烤棉花糖', price: 228, childPrice: 158, minPeople: 1, sortOrder: 3, showInBookingForm: true, specialPricing: springFestivalPricing },
    { name: '美食体验套餐', description: '石板烧烤+烤地瓜+烤棉花糖', price: 198, childPrice: 138, minPeople: 1, sortOrder: 4, showInBookingForm: true },
    { name: '全景套餐', description: '全部6个项目', price: 358, childPrice: 248, minPeople: 1, sortOrder: 5, showInBookingForm: true, specialPricing: springFestivalPricing },
    { name: '团队定制', description: '根据需求定制', price: 0, childPrice: 0, minPeople: 10, sortOrder: 6, showInBookingForm: false },
  ];

  const packages = [];
  for (const data of packageData) {
    const pkg = await prisma.package.upsert({
      where: { id: packageData.indexOf(data) + 1 },
      update: data,
      create: data,
    });
    packages.push(pkg);
    console.log(`   [OK] ${pkg.name} - ¥${pkg.price}`);
  }

  // 5. 创建套餐项目关联
  console.log('\n5. 创建套餐项目关联...');

  // 先删除现有关联
  await prisma.packageItem.deleteMany({});

  // 冰雪乐园套餐 (id=3): 冰钓(3) + 雪上滑梯(2) + 烤棉花糖(5)
  await prisma.packageItem.createMany({
    data: [
      { packageId: packages[2].id, projectId: projects[2].id }, // 冰钓
      { packageId: packages[2].id, projectId: projects[1].id }, // 雪上滑梯
      { packageId: packages[2].id, projectId: projects[4].id }, // 烤棉花糖
    ],
  });
  console.log('   [OK] 冰雪乐园套餐: 冰钓 + 雪上滑梯 + 烤棉花糖');

  // 美食体验套餐 (id=4): 石板烧烤(1) + 烤地瓜(6) + 烤棉花糖(5)
  await prisma.packageItem.createMany({
    data: [
      { packageId: packages[3].id, projectId: projects[0].id }, // 石板烧烤
      { packageId: packages[3].id, projectId: projects[5].id }, // 烤地瓜
      { packageId: packages[3].id, projectId: projects[4].id }, // 烤棉花糖
    ],
  });
  console.log('   [OK] 美食体验套餐: 石板烧烤 + 烤地瓜 + 烤棉花糖');

  // 全景套餐 (id=5): 全部6个项目
  await prisma.packageItem.createMany({
    data: projects.map(p => ({ packageId: packages[4].id, projectId: p.id })),
  });
  console.log('   [OK] 全景套餐: 全部6个项目');

  // 6. 创建教练
  console.log('\n6. 创建教练...');
  const coachData = [
    { name: '李教练', phone: '13800138001', specialties: '["冰钓", "丛林穿越"]', status: 'on_duty' },
    { name: '王教练', phone: '13800138002', specialties: '["雪上滑梯", "烤棉花糖"]', status: 'on_duty' },
    { name: '张教练', phone: '13800138003', specialties: '["石板烧烤", "烤地瓜"]', status: 'on_duty' },
  ];

  for (const data of coachData) {
    const coach = await prisma.coach.upsert({
      where: { id: coachData.indexOf(data) + 1 },
      update: data,
      create: data,
    });
    console.log(`   [OK] ${coach.name} - ${coach.phone}`);
  }

  // 7. 创建车辆
  console.log('\n7. 创建车辆...');
  const vehicleData = [
    { plateNumber: '吉B12345', vehicleType: '大巴', seats: 45, status: 'available' },
    { plateNumber: '吉B23456', vehicleType: '中巴', seats: 20, status: 'available' },
    { plateNumber: '吉B34567', vehicleType: '商务车', seats: 7, status: 'available' },
  ];

  for (const data of vehicleData) {
    const vehicle = await prisma.vehicle.upsert({
      where: { plateNumber: data.plateNumber },
      update: data,
      create: data,
    });
    console.log(`   [OK] ${vehicle.plateNumber} - ${vehicle.vehicleType} (${vehicle.seats}座)`);
  }

  // 8. 创建司机
  console.log('\n8. 创建司机...');
  const driverData = [
    { name: '刘师傅', phone: '13900139001', status: 'on_duty' },
    { name: '陈师傅', phone: '13900139002', status: 'on_duty' },
  ];

  for (const data of driverData) {
    const driver = await prisma.driver.upsert({
      where: { id: driverData.indexOf(data) + 1 },
      update: data,
      create: data,
    });
    console.log(`   [OK] ${driver.name} - ${driver.phone}`);
  }

  // 打印统计信息
  console.log('\n========================================');
  console.log('数据初始化完成!');
  console.log('========================================');
  console.log('\n统计信息:');
  console.log(`  - 用户: 1 个`);
  console.log(`  - 住宿地点: ${accommodations.length} 个`);
  console.log(`  - 项目: ${projects.length} 个`);
  console.log(`  - 套餐: ${packages.length} 个`);
  console.log(`  - 教练: ${coachData.length} 个`);
  console.log(`  - 车辆: ${vehicleData.length} 辆`);
  console.log(`  - 司机: ${driverData.length} 个`);
  console.log('\n登录信息:');
  console.log('  账号: admin');
  console.log('  密码: admin123');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
