CREATE TABLE public.categories (
  slug text PRIMARY KEY,
  name text NOT NULL,
  image_key text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly readable" ON public.categories FOR SELECT USING (true);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category_slug text NOT NULL REFERENCES public.categories(slug),
  metal text NOT NULL,
  karat text NOT NULL,
  gross_weight_g numeric(10,2) NOT NULL,
  stones text NOT NULL DEFAULT '',
  price_pkr integer NOT NULL,
  sale_price_pkr integer,
  image_keys text[] NOT NULL DEFAULT '{}',
  is_new boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are publicly readable" ON public.products FOR SELECT USING (true);

INSERT INTO public.categories (slug, name, image_key, sort_order) VALUES
 ('bridal-sets','Bridal Sets','bridal',1),
 ('gold-bangles','Gold Bangles','bangles',2),
 ('rings','Rings','rings',3),
 ('earrings','Earrings','earrings',4),
 ('lockets-chains','Lockets & Chains','lockets',5),
 ('silver-essentials','Silver Essentials','silver',6);

INSERT INTO public.products (sku,name,slug,category_slug,metal,karat,gross_weight_g,stones,price_pkr,sale_price_pkr,image_keys,is_new) VALUES
('AMJ-BR-1001','Mehr Polki Set','mehr-polki-set-1','bridal-sets','gold','18K',51.48,'Cubic zircon',1948000,1792000,ARRAY['earrings','bridal'],false),
('AMJ-BR-1002','Shahjahani Bridal Set','shahjahani-bridal-set-2','bridal-sets','gold','22K',53.03,'Cubic zircon',1542000,NULL,ARRAY['bridal','earrings'],false),
('AMJ-BR-1003','Tehmina Meenakari Set','tehmina-meenakari-set-3','bridal-sets','gold','18K',90.16,'Plain polished gold',2578000,2371000,ARRAY['bridal','heroBridal'],false),
('AMJ-BR-1004','Amna Polki Set','amna-polki-set-4','bridal-sets','gold','21K',89.11,'Hand-engraved, no stones',3094000,NULL,ARRAY['earrings','bridal'],true),
('AMJ-BR-1005','Zainab Bridal Set','zainab-bridal-set-5','bridal-sets','gold','18K',52.52,'Hand-engraved, no stones',1508000,1387000,ARRAY['heroBridal','earrings'],false),
('AMJ-BR-1006','Kiran Meenakari Set','kiran-meenakari-set-6','bridal-sets','gold','22K',69.58,'Emerald & Pearl',2611000,NULL,ARRAY['earrings','heroBridal'],true),
('AMJ-BR-1007','Mahira Jhumar Set','mahira-jhumar-set-7','bridal-sets','gold','18K',80.32,'Meenakari, Zircon & Pearl',2835000,2608000,ARRAY['bridal','heroBridal'],false),
('AMJ-BR-1008','Mahnoor Jhumar Set','mahnoor-jhumar-set-8','bridal-sets','gold','21K',117.27,'Cubic zircon',3392000,NULL,ARRAY['heroBridal','earrings'],false),
('AMJ-BN-1009','Warda Filigree Kara','warda-filigree-kara-9','gold-bangles','gold','18K',19.84,'Emerald & Pearl',404000,371000,ARRAY['silver','bangles'],true),
('AMJ-BN-1010','Shahjahani Filigree Kara','shahjahani-filigree-kara-10','gold-bangles','gold','22K',18.19,'Emerald & Pearl',460000,NULL,ARRAY['rings','bangles'],false),
('AMJ-BN-1011','Saira Slim Kara Pair','saira-slim-kara-pair-11','gold-bangles','gold','21K',7.97,'Emerald & Pearl',173000,NULL,ARRAY['rings','bangles'],false),
('AMJ-BN-1012','Sadaf Wide Cuff','sadaf-wide-cuff-12','gold-bangles','gold','18K',9.2,'Cubic zircon',191000,NULL,ARRAY['silver','rings'],false),
('AMJ-BN-1013','Zainab Wide Cuff','zainab-wide-cuff-13','gold-bangles','diamond','18K',6.59,'Certified Diamond 0.32 ct',138000,126000,ARRAY['rings','bangles'],true),
('AMJ-BN-1014','Hania Filigree Kara','hania-filigree-kara-14','gold-bangles','gold','21K',12.09,'Plain polished gold',268000,NULL,ARRAY['silver','bangles'],false),
('AMJ-BN-1015','Kiran Wide Cuff','kiran-wide-cuff-15','gold-bangles','gold','22K',11.58,'Cubic zircon',265000,NULL,ARRAY['bangles','rings'],true),
('AMJ-BN-1016','Sadaf Slim Kara Pair','sadaf-slim-kara-pair-16','gold-bangles','gold','18K',4.58,'Meenakari, Zircon & Pearl',91000,83000,ARRAY['rings','bangles'],true),
('AMJ-RG-1017','Noor Ruby Band','noor-ruby-band-17','rings','gold','21K',16.51,'Cubic zircon',424000,NULL,ARRAY['rings','lockets'],false),
('AMJ-RG-1018','Kiran Engraved Band','kiran-engraved-band-18','rings','gold','22K',5.26,'Emerald & Pearl',108000,NULL,ARRAY['bangles','rings'],true),
('AMJ-RG-1019','Mahira Solitaire Ring','mahira-solitaire-ring-19','rings','diamond','18K',23.0,'Certified Diamond 0.32 ct',532000,489000,ARRAY['rings','lockets'],false),
('AMJ-RG-1020','Tehmina Solitaire Ring','tehmina-solitaire-ring-20','rings','gold','18K',11.02,'Kundan & Pearl',231000,NULL,ARRAY['bangles','lockets'],false),
('AMJ-RG-1021','Tehmina Ruby Band','tehmina-ruby-band-21','rings','diamond','18K',20.02,'Certified Diamond 0.32 ct',498000,NULL,ARRAY['bangles','lockets'],true),
('AMJ-RG-1022','Zainab Solitaire Ring','zainab-solitaire-ring-22','rings','gold','22K',13.18,'Plain polished gold',278000,NULL,ARRAY['bangles','lockets'],false),
('AMJ-RG-1023','Zainab Halo Ring','zainab-halo-ring-23','rings','diamond','18K',5.59,'Certified Diamond 0.32 ct',127000,NULL,ARRAY['bangles','rings'],false),
('AMJ-RG-1024','Laraib Halo Ring','laraib-halo-ring-24','rings','gold','18K',5.96,'Ruby & Zircon',133000,NULL,ARRAY['rings','lockets'],true),
('AMJ-ER-1025','Iqra Chandbali','iqra-chandbali-25','earrings','gold','18K',11.61,'Ruby & Zircon',260000,NULL,ARRAY['earrings','bridal'],false),
('AMJ-ER-1026','Gulbadan Jhumka Pair','gulbadan-jhumka-pair-26','earrings','gold','18K',6.5,'Emerald & Pearl',162000,NULL,ARRAY['lockets','earrings'],false),
('AMJ-ER-1027','Nayab Jhumka Pair','nayab-jhumka-pair-27','earrings','gold','21K',19.89,'Plain polished gold',484000,445000,ARRAY['earrings','lockets'],false),
('AMJ-ER-1028','Dua Jhumka Pair','dua-jhumka-pair-28','earrings','diamond','18K',4.07,'Certified Diamond 0.32 ct',86000,NULL,ARRAY['lockets','bridal'],false),
('AMJ-ER-1029','Nayab Stud Pair','nayab-stud-pair-29','earrings','gold','21K',22.16,'Pearl drop',490000,NULL,ARRAY['bridal','lockets'],false),
('AMJ-ER-1030','Bushra Jhumka Pair','bushra-jhumka-pair-30','earrings','gold','21K',14.23,'Hand-engraved, no stones',286000,NULL,ARRAY['earrings','bridal'],true),
('AMJ-ER-1031','Sadaf Jhumka Pair','sadaf-jhumka-pair-31','earrings','gold','18K',18.37,'Emerald & Pearl',428000,NULL,ARRAY['bridal','lockets'],false),
('AMJ-ER-1032','Iqra Everyday Tops','iqra-everyday-tops-32','earrings','gold','21K',8.59,'Hand-engraved, no stones',186000,NULL,ARRAY['bridal','earrings'],false),
('AMJ-LK-1033','Zara Locket & Chain','zara-locket-and-chain-33','lockets-chains','gold','22K',16.06,'Emerald & Pearl',369000,NULL,ARRAY['earrings','bangles'],false),
('AMJ-LK-1034','Mahira Ayat Pendant','mahira-ayat-pendant-34','lockets-chains','gold','22K',22.42,'Hand-engraved, no stones',568000,522000,ARRAY['earrings','lockets'],false),
('AMJ-LK-1035','Fatima Heart Locket','fatima-heart-locket-35','lockets-chains','gold','21K',17.26,'Meenakari, Zircon & Pearl',389000,357000,ARRAY['lockets','bangles'],false),
('AMJ-LK-1036','Warda Rope Chain','warda-rope-chain-36','lockets-chains','gold','22K',21.6,'Pearl drop',557000,512000,ARRAY['earrings','bangles'],false),
('AMJ-LK-1037','Sadaf Ayat Pendant','sadaf-ayat-pendant-37','lockets-chains','gold','18K',12.35,'Pearl drop',285000,NULL,ARRAY['earrings','lockets'],true),
('AMJ-LK-1038','Yusra Rope Chain','yusra-rope-chain-38','lockets-chains','gold','22K',14.86,'Plain polished gold',336000,309000,ARRAY['bangles','earrings'],false),
('AMJ-LK-1039','Mahira Locket & Chain','mahira-locket-and-chain-39','lockets-chains','gold','21K',23.42,'Ruby & Zircon',483000,NULL,ARRAY['lockets','earrings'],true),
('AMJ-LK-1040','Zara Ayat Pendant','zara-ayat-pendant-40','lockets-chains','gold','18K',20.29,'Cubic zircon',437000,402000,ARRAY['bangles','earrings'],false),
('AMJ-SL-1041','Warda Silver Cuff','warda-silver-cuff-41','silver-essentials','silver','925',7.43,'Cubic zircon',20000,NULL,ARRAY['silver','rings'],false),
('AMJ-SL-1042','Gulbadan Silver Stack Trio','gulbadan-silver-stack-trio-42','silver-essentials','silver','925',18.83,'Cubic zircon',21000,NULL,ARRAY['silver','rings'],true),
('AMJ-SL-1043','Gulbadan Silver Cuff','gulbadan-silver-cuff-43','silver-essentials','silver','925',21.91,'Cubic zircon',35000,NULL,ARRAY['silver','lockets'],false),
('AMJ-SL-1044','Zohra Silver Anklet','zohra-silver-anklet-44','silver-essentials','silver','925',10.19,'Cubic zircon',25000,NULL,ARRAY['lockets','silver'],false),
('AMJ-SL-1045','Rida Silver Studs','rida-silver-studs-45','silver-essentials','silver','925',14.0,'Cubic zircon',25000,NULL,ARRAY['rings','silver'],true),
('AMJ-SL-1046','Gulbadan Silver Stack Trio','gulbadan-silver-stack-trio-46','silver-essentials','silver','925',17.73,'Cubic zircon',41000,37000,ARRAY['rings','silver'],false),
('AMJ-SL-1047','Uzma Silver Studs','uzma-silver-studs-47','silver-essentials','silver','925',16.5,'Cubic zircon',40000,NULL,ARRAY['rings','silver'],false),
('AMJ-SL-1048','Ayesha Silver Cuff','ayesha-silver-cuff-48','silver-essentials','silver','925',9.18,'Cubic zircon',55000,NULL,ARRAY['rings','silver'],true);