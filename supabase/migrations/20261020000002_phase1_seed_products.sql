-- 기존 js/data.js 상품 28개를 DB로 옮겨요. 품절이던 사이즈는 재고 0, 나머지는 20개로 시작해요.
insert into public.products (id, category, sub_category, brand, name, price, sale_rate, badges, photo_id, photo_by, art, bg_color, main_color, accent_color, stripe, likes, reviews, rating, sort_order) values
  ('T001', 'top', '반소매 티셔츠', 'LAYERED', '오버핏 피그먼트 반소매 티셔츠 차콜', 39000, 32, array['free', 'only']::text[], '1621951767587-b24334f11c65', 'Geoffroy Danest', 'tee', '#e9e6e1', '#3b3b3d', '#2a2a2c', false, 18234, 4211, 4.9, 1),
  ('T002', 'top', '반소매 티셔츠', 'MONOWAVE', '베이직 코튼 크루넥 티셔츠 화이트', 25000, 20, array['free']::text[], '1581655353564-df123a1eb820', 'Haryo Setyadi', 'tee', '#dfe6ec', '#fafafa', '#e1e1e1', false, 9821, 2810, 4.8, 2),
  ('T003', 'top', '긴소매 티셔츠', 'NORTHFOLK', '헤비웨이트 롱슬리브 티셔츠 네이비', 45000, 15, array['free']::text[], '1618354691551-44de113f0164', 'Ryan Hoffman', 'long', '#ece8df', '#1f2b4a', '#17213a', false, 7310, 1203, 4.8, 3),
  ('T004', 'top', '셔츠/블라우스', 'STUDIO K', '옥스포드 버튼다운 셔츠 스카이블루', 59000, 30, array['only']::text[], '1602810316693-3667c854239a', 'Nimble Made', 'shirt', '#f1ece6', '#a9c6e8', '#8db0d8', false, 6522, 980, 4.7, 4),
  ('T005', 'top', '후드 티셔츠', 'LAYERED', '투웨이 스웻 후드 집업 멜란지 그레이', 69000, 25, array['free', 'only']::text[], '1556821840-3a63f95609a7', 'Jannes Jacobs', 'hood', '#e3e8e4', '#b9bbbd', '#9fa2a5', false, 15420, 3320, 4.9, 5),
  ('T006', 'top', '니트/스웨터', 'WOOLMARK HOUSE', '램스울 크루넥 니트 오트밀', 79000, 40, array['free']::text[], '1634901581982-6b408cf4226a', 'Kateryna Hliznitsova', 'long', '#e7e2ea', '#d9c8ad', '#c4b291', false, 11205, 1755, 4.8, 6),
  ('T007', 'top', '반소매 티셔츠', 'CITYBOY CLUB', '로고 그래픽 반소매 티셔츠 블랙', 35000, 10, array[]::text[], '1618354691438-25bc04584c23', 'Ryan Hoffman', 'tee', '#f3e9d8', '#151515', '#ffffff', false, 5310, 802, 4.7, 7),
  ('T008', 'top', '후드 티셔츠', 'MONOWAVE', '헤비 기모 오버핏 후드 티셔츠 버건디', 59000, 35, array['free']::text[], '1578768079052-aa76e52ff62e', 'Ali Saadat', 'hood', '#e8e4dc', '#6e1f2a', '#561820', false, 8740, 1430, 4.8, 8),
  ('T009', 'top', '셔츠/블라우스', 'NORTHFOLK', '코듀로이 오버셔츠 브라운', 72000, 22, array[]::text[], '1782227293813-040b9f9ce99e', 'Jonathan Adams', 'shirt', '#e4e8ee', '#7a5236', '#5f3f29', false, 4120, 512, 4.6, 9),
  ('T010', 'top', '긴소매 티셔츠', 'CITYBOY CLUB', '스트라이프 롱슬리브 티셔츠 아이보리', 42000, 18, array['free']::text[], '1620799140408-edc6dcb6d633', 'Mediamodifier', 'long', '#e0e7e9', '#f2ede1', '#2b3d6b', true, 3950, 640, 4.7, 10),
  ('S001', 'shoes', '스니커즈', 'RUNLAB', '클래식 레더 로우 스니커즈 화이트', 99000, 20, array['free', 'only']::text[], '1561282109-3a8f490997cc', 'Aymen Chabani', 'sneaker', '#e7ebef', '#fbfbfb', '#1d1d1d', false, 22140, 6890, 4.9, 11),
  ('S002', 'shoes', '러닝화', 'STRIDE', '쿠셔닝 데일리 러닝화 블랙', 129000, 15, array['free']::text[], '1560769629-975ec94e6a86', 'Irene Kredenets', 'sneaker', '#ece7df', '#202020', '#ff5a1f', false, 13200, 2840, 4.8, 12),
  ('S003', 'shoes', '로퍼', 'OXFORD ROW', '페니 로퍼 블랙 레더', 149000, 30, array['free']::text[], '1760616172899-0681b97a2de3', 'taha siddiqui', 'loafer', '#ebe5df', '#1a1a1a', '#3a3a3a', false, 9870, 1650, 4.8, 13),
  ('S004', 'shoes', '부츠', 'TRAILMADE', '6인치 워커 부츠 휘트', 189000, 25, array['free', 'only']::text[], '1605812860427-4024433a70fd', 'Maxim Hopman', 'boot', '#e2e7e3', '#c38d4e', '#8a5b2b', false, 7340, 980, 4.7, 14),
  ('S005', 'shoes', '스니커즈', 'COURTSIDE', '캔버스 하이브리드 스니커즈 크림', 69000, 10, array[]::text[], '1641997465126-c73cc4070337', 'Axel Bimashanda', 'sneaker', '#e6e3ec', '#efe6d2', '#2c4b8a', false, 6120, 1220, 4.7, 15),
  ('S006', 'shoes', '러닝화', 'RUNLAB', '경량 메쉬 러닝화 라이트그레이', 119000, 28, array['free']::text[], '1720019315323-5e2b98a58ba8', 'Elie Dagher', 'sneaker', '#efe8de', '#c9cdd2', '#2f7df6', false, 8420, 1730, 4.8, 16),
  ('S007', 'shoes', '로퍼', 'OXFORD ROW', '스웨이드 태슬 로퍼 브라운', 139000, 35, array[]::text[], '1676121270762-47c8d3a7b9d5', 'Nelibar Shoes', 'loafer', '#e4e9ed', '#7a5038', '#5c3a26', false, 3420, 410, 4.6, 17),
  ('S008', 'shoes', '부츠', 'TRAILMADE', '첼시 부츠 블랙 스무스', 169000, 20, array['free']::text[], '1605732440685-d0654d81aa30', 'mostafa mahmoudi', 'boot', '#ece4e1', '#222222', '#3b3b3b', false, 5890, 760, 4.8, 18),
  ('S009', 'shoes', '스니커즈', 'COURTSIDE', '레트로 스웨이드 스니커즈 그린', 89000, 22, array['only']::text[], '1727061180303-d91cdeca6f9c', 'SJ', 'sneaker', '#efebe3', '#2f6b4f', '#f3efe4', false, 4780, 690, 4.7, 19),
  ('P001', 'pants', '데님 팬츠', 'INDIGO WORKS', '와이드 스트레이트 데님 팬츠 미드블루', 69000, 30, array['free', 'only']::text[], '1624378440847-4a64ee1a889d', 'Matthew Moloney', 'pants', '#ece8e1', '#4a6d9c', '#3a5880', false, 19870, 5320, 4.9, 20),
  ('P002', 'pants', '슬랙스', 'STUDIO K', '세미와이드 원턱 슬랙스 블랙', 49000, 25, array['free']::text[], '1718252540511-e958742e4165', 'TuanAnh Blue', 'pants', '#e3e8ec', '#1c1c1e', '#333336', false, 16540, 4410, 4.9, 21),
  ('P003', 'pants', '카고 팬츠', 'FIELDNOTE', '나일론 파라슈트 카고 팬츠 올리브', 79000, 20, array['free']::text[], '1766575696324-5b65330f23c2', 'sammy swae', 'cargo', '#efe9e2', '#5b6041', '#474b33', false, 9120, 1670, 4.8, 22),
  ('P004', 'pants', '트레이닝 팬츠', 'MONOWAVE', '스웻 조거 트레이닝 팬츠 멜란지', 45000, 15, array[]::text[], '1602573991155-21f0143bb45c', 'engin akyurt', 'pants', '#e6e2ea', '#a9abae', '#8f9295', false, 7340, 1290, 4.7, 23),
  ('P005', 'pants', '숏 팬츠', 'CITYBOY CLUB', '코튼 버뮤다 쇼츠 베이지', 39000, 30, array['free']::text[], '1591195853828-11db59a44f6b', 'engin akyurt', 'shorts', '#e1e7e6', '#cdb48f', '#b39a74', false, 5210, 830, 4.7, 24),
  ('P006', 'pants', '데님 팬츠', 'INDIGO WORKS', '슬림 테이퍼드 데님 팬츠 블랙', 72000, 18, array[]::text[], '1714143136372-ddaf8b606da7', 'TuanAnh Blue', 'pants', '#efe7de', '#2b2d33', '#1f2025', false, 6610, 1180, 4.8, 25),
  ('P007', 'pants', '카고 팬츠', 'FIELDNOTE', '코튼 립스탑 카고 팬츠 베이지', 75000, 35, array['free', 'only']::text[], '1548883354-7622d03aca27', 'Kyle Loftus', 'cargo', '#e5e9ee', '#d2c2a2', '#b6a582', false, 8020, 1410, 4.8, 26),
  ('P008', 'pants', '슬랙스', 'NORTHFOLK', '울 블렌드 테이퍼드 슬랙스 그레이', 89000, 40, array['free']::text[], '1619032209422-fc090f6a3f5f', 'Zoe', 'pants', '#ece6e0', '#6e7176', '#55585c', false, 4390, 560, 4.7, 27),
  ('P009', 'pants', '숏 팬츠', 'STRIDE', '러닝 나일론 쇼츠 네이비', 35000, 10, array[]::text[], '1789110520350-db58d2271c63', 'engin akyurt', 'shorts', '#efebe5', '#1f2b4a', '#2f7df6', false, 2980, 420, 4.6, 28);

-- 사이즈: 상의 S~XXL, 신발 230~280, 바지 28~36
insert into public.product_sizes (product_id, size, stock, sort_order)
select p.id, s.size, 20, s.ord
  from public.products p
  join (values
    ('top', 'S', 1), ('top', 'M', 2), ('top', 'L', 3), ('top', 'XL', 4), ('top', 'XXL', 5),
    ('shoes', '230', 1), ('shoes', '240', 2), ('shoes', '250', 3), ('shoes', '260', 4), ('shoes', '270', 5), ('shoes', '280', 6),
    ('pants', '28', 1), ('pants', '30', 2), ('pants', '32', 3), ('pants', '34', 4), ('pants', '36', 5)
  ) as s (category, size, ord) on s.category = p.category;

-- 기존에 품절로 표시하던 사이즈
update public.product_sizes set stock = 0
 where (product_id, size) in (('T001', 'XXL'), ('T005', 'S'), ('S001', '230'), ('S004', '280'), ('P001', '36'));
