// Country, English name, Arabic name and curated aliases. Names describe clubs,
// not current league membership, so the challenge pool survives promotion/relegation.
export const countries = {
  england: { en: 'England', ar: 'إنجلترا', flag: '🏴', region: 'europe' },
  spain: { en: 'Spain', ar: 'إسبانيا', flag: '🇪🇸', region: 'europe' },
  italy: { en: 'Italy', ar: 'إيطاليا', flag: '🇮🇹', region: 'europe' },
  germany: { en: 'Germany', ar: 'ألمانيا', flag: '🇩🇪', region: 'europe' },
  france: { en: 'France', ar: 'فرنسا', flag: '🇫🇷', region: 'europe' },
  portugal: { en: 'Portugal', ar: 'البرتغال', flag: '🇵🇹', region: 'europe' },
  netherlands: { en: 'Netherlands', ar: 'هولندا', flag: '🇳🇱', region: 'europe' },
  scotland: { en: 'Scotland', ar: 'اسكتلندا', flag: '🏴', region: 'europe' },
  turkey: { en: 'Türkiye', ar: 'تركيا', flag: '🇹🇷', region: 'europe' },
  saudi: { en: 'Saudi Arabia', ar: 'السعودية', flag: '🇸🇦', region: 'asia' },
  uae: { en: 'United Arab Emirates', ar: 'الإمارات', flag: '🇦🇪', region: 'asia' },
  egypt: { en: 'Egypt', ar: 'مصر', flag: '🇪🇬', region: 'africa' },
  morocco: { en: 'Morocco', ar: 'المغرب', flag: '🇲🇦', region: 'africa' },
  brazil: { en: 'Brazil', ar: 'البرازيل', flag: '🇧🇷', region: 'americas' },
  argentina: { en: 'Argentina', ar: 'الأرجنتين', flag: '🇦🇷', region: 'americas' },
  usa: { en: 'United States', ar: 'الولايات المتحدة', flag: '🇺🇸', region: 'americas' },
};
const groups = {
england: `Arsenal|أرسنال|arsenal fc,ارسنال,الارسنال,gunners
Manchester United|مانشستر يونايتد|man utd,man united,man u,manchester utd,mufc,مان يونايتد,مان يونايتيد,مانشستر يونيتد
Manchester City|مانشستر سيتي|man city,mancity,mcfc,مان سيتي,مانشستر سيتى
Liverpool|ليفربول|liverpool fc,lfc,ليفر,الليفر
Chelsea|تشيلسي|chelsea fc,تشلسي,تشيلسى
Tottenham Hotspur|توتنهام هوتسبير|tottenham,spurs,thfc,توتنهام,توتنهام هوتسبر
Newcastle United|نيوكاسل يونايتد|newcastle,nufc,نيوكاسل
Aston Villa|أستون فيلا|astonvilla,avfc,استون فيلا,أستون ڤيلا
Everton|إيفرتون|everton fc,ايفرتون
West Ham United|وست هام يونايتد|west ham,westham,وست هام,ويست هام
Brighton & Hove Albion|برايتون أند هوف ألبيون|brighton,brighton and hove albion,brighton hove albion,برايتون
Crystal Palace|كريستال بالاس|palace,كريستال بالاس
Fulham|فولهام|fulham fc,فولام
Wolverhampton Wanderers|وولفرهامبتون|wolves,wolverhampton,ولفرهامبتون,الولفز
Nottingham Forest|نوتنغهام فورست|nottingham,forest,نوتنغهام,نوتينغهام فورست
Leicester City|ليستر سيتي|leicester,ليستر
Leeds United|ليدز يونايتد|leeds,ليدز
Southampton|ساوثهامبتون|saints,ساوثامبتون
Bournemouth|بورنموث|afc bournemouth,بورنموث
Brentford|برينتفورد|brentford fc,برنتفورد
Burnley|بيرنلي|burnley fc,بيرنلى
Sunderland|سندرلاند|sunderland afc
Sheffield United|شيفيلد يونايتد|sheffield utd,شيفيلد يونايتيد
Sheffield Wednesday|شيفيلد وينزداي|sheff wednesday,شيفيلد وينزدي
Ipswich Town|إيبسويتش تاون|ipswich,ايبسويتش
Norwich City|نورويتش سيتي|norwich,نورويتش
Watford|واتفورد|watford fc
Derby County|ديربي كاونتي|derby,ديربي
Blackburn Rovers|بلاكبيرن روفرز|blackburn,بلاكبيرن
Middlesbrough|ميدلزبره|boro,ميدلسبره`,
spain: `Real Madrid|ريال مدريد|real,realmadrid,ريال,الريال,ريال مدريـد
Barcelona|برشلونة|fc barcelona,barca,barça,fcb,برشلونه,البارسا,بارسا
Atlético Madrid|أتلتيكو مدريد|atletico,atletico madrid,atleti,اتليتيكو مدريد,اتلتيكو,اتليتكو مدريد,أتلتيكو
Sevilla|إشبيلية|sevilla fc,seville,اشبيلية
Valencia|فالنسيا|valencia cf,ڤالنسيا
Villarreal|فياريال|villarreal cf,villareal,ڤياريال
Real Betis|ريال بيتيس|betis,بيتيس
Athletic Bilbao|أتلتيك بلباو|athletic club,athletic,athletic bilbao,bilbao,اتلتيك بلباو,بلباو,أتلتيك بيلباو
Real Sociedad|ريال سوسيداد|sociedad,سوسيداد
Girona|جيرونا|girona fc,خيرونا
Celta Vigo|سيلتا فيغو|celta,rc celta,سيلتا فيجو,سيلتا
Espanyol|إسبانيول|rcd espanyol,اسبانيول
Getafe|خيتافي|getafe cf,خيتافى
Osasuna|أوساسونا|ca osasuna,اوساسونا
Mallorca|مايوركا|rcd mallorca,ريال مايوركا
Las Palmas|لاس بالماس|ud las palmas
Deportivo La Coruña|ديبورتيفو لاكورونيا|deportivo,deportivo la coruna,la coruna,ديبورتيفو
Real Zaragoza|ريال سرقسطة|zaragoza,سرقسطة`,
italy: `AC Milan|إيه سي ميلان|milan,acm,a c milan,اي سي ميلان,ميلان,اسي ميلان
Inter Milan|إنتر ميلان|inter,internazionale,inter milano,fc internazionale,انتر ميلان,الانتر,إنتر,انتر
Juventus|يوفنتوس|juve,juventus fc,يوفي,يوڤنتوس,اليوفي,يوفنتس
Napoli|نابولي|ssc napoli,نابولى
AS Roma|روما|roma,asroma,a s roma,اي اس روما
Lazio|لاتسيو|ss lazio,لاتزيو
Atalanta|أتالانتا|atalanta bc,اتالانتا
Fiorentina|فيورنتينا|acf fiorentina,فيورنتينا
Bologna|بولونيا|bologna fc,بولونيا
Torino|تورينو|torino fc,turin
Genoa|جنوى|genoa cfc,جينوا
Sampdoria|سامبدوريا|uc sampdoria
Parma|بارما|parma calcio
Udinese|أودينيزي|udinese calcio,اودينيزي
Sassuolo|ساسولو|us sassuolo
Como|كومو|como 1907
Cagliari|كالياري|cagliari calcio
Hellas Verona|هيلاس فيرونا|verona,فيرونا
Palermo|باليرمو|palermo fc
Lecce|ليتشي|us lecce`,
germany: `Bayern Munich|بايرن ميونخ|bayern,bayern munchen,bayern münchen,fc bayern,بايرن,البايرن,بايرن ميونيخ
Borussia Dortmund|بوروسيا دورتموند|dortmund,bvb,دورتموند,بروسيا دورتموند
Bayer Leverkusen|باير ليفركوزن|leverkusen,bayer 04 leverkusen,ليفركوزن
RB Leipzig|آر بي لايبزيغ|leipzig,rasenballsport leipzig,لايبزيغ,لايبزيج
Eintracht Frankfurt|آينتراخت فرانكفورت|frankfurt,eintracht,فرانكفورت,اينتراخت فرانكفورت
Stuttgart|شتوتغارت|vfb stuttgart,شتوتجارت
Wolfsburg|فولفسبورغ|vfl wolfsburg,فولفسبورج
Werder Bremen|فيردر بريمن|bremen,werder,بريمن
Borussia Mönchengladbach|بوروسيا مونشنغلادباخ|gladbach,monchengladbach,mönchengladbach,borussia monchengladbach,غلادباخ,مونشنغلادباخ
Schalke 04|شالكه 04|schalke,شالكه,شالكة
Hamburg|هامبورغ|hamburger sv,hsv,hamburg sv,هامبورج
Hoffenheim|هوفنهايم|tsg hoffenheim,tsg 1899 hoffenheim
Freiburg|فرايبورغ|sc freiburg,فرايبورج
Mainz 05|ماينز 05|mainz,ماينز
FC Köln|كولن|koln,köln,cologne,fc cologne
Union Berlin|يونيون برلين|union,fc union berlin,اونيون برلين
Hertha Berlin|هيرتا برلين|hertha,hertha bsc
Augsburg|أوغسبورغ|fc augsburg,اوغسبورغ`,
france: `Paris Saint-Germain|باريس سان جيرمان|psg,paris saint germain,paris sg,باريس,بي اس جي,باريس سان جرمان
Marseille|مارسيليا|olympique marseille,olympique de marseille,om,مارسيليا
Lyon|ليون|olympique lyon,olympique lyonnais,ol,أولمبيك ليون
Monaco|موناكو|as monaco,asm
Lille|ليل|losc,losc lille
Nice|نيس|ogc nice
Rennes|رين|stade rennais,rennais
Lens|لانس|rc lens
Saint-Étienne|سانت إتيان|saint etienne,st etienne,asse,سانت اتيان
Nantes|نانت|fc nantes
Strasbourg|ستراسبورغ|rc strasbourg,ستراسبورج
Montpellier|مونبلييه|montpellier hsc,مونبلييه
Bordeaux|بوردو|girondins bordeaux,girondins de bordeaux
Toulouse|تولوز|toulouse fc
Brest|بريست|stade brestois,brestois`,
portugal: `Benfica|بنفيكا|sl benfica,sport lisboa e benfica,بينفيكا
Porto|بورتو|fc porto
Sporting CP|سبورتينغ لشبونة|sporting,sporting lisbon,sporting clube de portugal,سبورتنج لشبونة,سبورتينغ,سبورتنج
Braga|براغا|sc braga,براغا
Vitória Guimarães|فيتوريا غيماريش|vitoria guimaraes,guimaraes,vitoria sc,غيماريش
Boavista|بوافيشتا|boavista fc,بوافيستا
Famalicão|فاماليكاو|famalicao
Rio Ave|ريو آفي|rioave,ريو افي`,
netherlands: `Ajax|أياكس|ajax amsterdam,afc ajax,اياكس
PSV Eindhoven|بي إس في آيندهوفن|psv,eindhoven,ايندهوفن,بي اس في,آيندهوفن
Feyenoord|فينورد|feyenoord rotterdam,فينورد روتردام
AZ Alkmaar|ألكمار|az,alkmaar,اي زد الكمار
Twente|تفينتي|fc twente,تفينتى
Utrecht|أوتريخت|fc utrecht,اوتريخت
Groningen|خرونينغن|fc groningen,غرونينغن
Heerenveen|هيرنفين|sc heerenveen`,
scotland: `Celtic|سيلتيك|celtic fc,سلتيك
Rangers|رينجرز|rangers fc,glasgow rangers,غلاسكو رينجرز
Aberdeen|أبردين|aberdeen fc,ابردين
Hearts|هارتس|heart of midlothian,هارت أوف ميدلوثيان
Hibernian|هيبرنيان|hibs,هيبرنيان
Dundee United|دندي يونايتد|dundee utd,داندي يونايتد`,
turkey: `Galatasaray|غلطة سراي|gala,galatasaray sk,جالاتا سراي,غلاطة سراي,غالاتاسراي
Fenerbahçe|فنربخشة|fenerbahce,fener,فنربهشة,فنرباتشي
Beşiktaş|بشكتاش|besiktas,beşiktaş jk,بيشكتاش
Trabzonspor|طرابزون سبور|trabzon,طرابزون
Başakşehir|باشاك شهير|basaksehir,istanbul basaksehir
Bursaspor|بورصة سبور|bursa,بورصا سبور`,
saudi: `Al Hilal|الهلال السعودي|al hilal,alhilal,hilal,الهلال,هلال,الزعيم
Al Nassr|النصر السعودي|al nassr,alnassr,nassr,النصر,نصر
Al Ittihad|الاتحاد السعودي|al ittihad,alittihad,ittihad,الاتحاد,اتحاد,اتحاد جدة
Al Ahli Saudi|الأهلي السعودي|al ahli,al ahli saudi,alahli,ahli,الأهلي,اهلي,اهلي جدة,الأهلي جدة
Al Shabab Saudi|الشباب السعودي|al shabab,alshabab,shabab,الشباب
Al Ettifaq|الاتفاق|al ettifaq,ettifaq,al etifaq,الاتفاق السعودي
Al Taawoun|التعاون|al taawoun,taawoun
Al Fateh|الفتح|al fateh,fateh
Al Qadsiah|القادسية السعودي|al qadsiah,qadsiah,القادسية
Al Riyadh|الرياض|al riyadh,riyadh
Al Fayha|الفيحاء|al fayha,fayha
Damac|ضمك|damac fc,damak
Al Khaleej|الخليج|al khaleej,khaleej
Al Raed|الرائد|al raed,raed`,
uae: `Al Ain|العين|al ain,alain,ain,العين الاماراتي
Shabab Al Ahli|شباب الأهلي|shabab al ahli,shabab al ahli dubai,شباب الاهلي دبي
Al Wasl|الوصل|al wasl,alwasl,wasl
Al Wahda UAE|الوحدة الإماراتي|al wahda,alwahda,wahda,الوحدة
Al Jazira|الجزيرة|al jazira,aljazira,jazira
Sharjah|الشارقة|al sharjah,sharjah fc
Al Nasr Dubai|النصر الإماراتي|al nasr,al nasr dubai,النصر,نصر,النصر دبي
Baniyas|بني ياس|bani yas,بنيياس
Ajman|عجمان|ajman club
Kalba|كلباء|ittihad kalba,al ittihad kalba,اتحاد كلباء
Khor Fakkan|خورفكان|khorfakkan,خور فكان`,
egypt: `Al Ahly|الأهلي المصري|al ahly,alahly,ahly,al ahli,الأهلي,اهلي,الاهلي القاهري
Zamalek|الزمالك|zamalek sc,الزمالك المصري
Pyramids|بيراميدز|pyramids fc
Ismaily|الإسماعيلي|ismaily sc,ismaili,اسماعيلي
Al Masry|المصري|al masry,el masry,المصري البورسعيدي
Al Ittihad Alexandria|الاتحاد السكندري|al ittihad alexandria,ittihad alexandria,الاتحاد
Smouha|سموحة|smouha sc
Enppi|إنبي|enppi sc,انبي
Ceramica Cleopatra|سيراميكا كليوباترا|ceramica,سيراميكا
ZED|زد|zed fc,زد اف سي`,
morocco: `Raja Casablanca|الرجاء الرياضي|raja,raja ca,raja club athletic,الرجاء,رجاء
Wydad Casablanca|الوداد الرياضي|wydad,wac,wydad ac,الوداد,وداد
AS FAR|الجيش الملكي|far rabat,as far rabat,far,الجيش
FUS Rabat|الفتح الرباطي|fus,fath union sport
RS Berkane|نهضة بركان|berkane,rsb,بركان
Moghreb Tétouan|المغرب التطواني|moghreb tetouan,tetouan,تطوان`,
brazil: `Flamengo|فلامنغو|cr flamengo,فلامنجو
Palmeiras|بالميراس|se palmeiras
Santos|سانتوس|santos fc
Corinthians|كورينثيانز|corinthians paulista,كورينثيانس
São Paulo|ساو باولو|sao paulo,sao paulo fc,ساوباولو
Fluminense|فلومينينسي|fluminense fc,فلومينينزي
Botafogo|بوتافوغو|botafogo fr,بوتافوجو
Vasco da Gama|فاسكو دا غاما|vasco,vasco da gama,فاسكو دي جاما
Grêmio|غريميو|gremio,جريميو
Internacional|إنترناسيونال|sport club internacional,انترناسيونال
Cruzeiro|كروزيرو|cruzeiro ec
Atlético Mineiro|أتلتيكو مينيرو|atletico mineiro,galo,اتلتيكو مينيرو`,
argentina: `Boca Juniors|بوكا جونيورز|boca,بوكا
River Plate|ريفر بليت|river,ريفر
Racing Club|راسينغ كلوب|racing,racing club de avellaneda,راسينج
Independiente|إنديبندينتي|ca independiente,انديبندينتي
San Lorenzo|سان لورينزو|san lorenzo de almagro
Estudiantes|إستوديانتيس|estudiantes de la plata,استوديانتيس
Vélez Sarsfield|فيليز سارسفيلد|velez,velez sarsfield,فيليز
Newell's Old Boys|نيولز أولد بويز|newells,newells old boys,newell s old boys,نيولز`,
usa: `Inter Miami|إنتر ميامي|inter miami cf,miami,انتر ميامي
LA Galaxy|لوس أنجلوس غالاكسي|la galaxy,galaxy,los angeles galaxy,لوس انجلوس جالاكسي,غالاكسي
Los Angeles FC|لوس أنجلوس إف سي|lafc,la fc,los angeles fc,لوس انجلوس اف سي
Seattle Sounders|سياتل ساوندرز|seattle,seattle sounders fc,سياتل
Atlanta United|أتلانتا يونايتد|atlanta,atlanta united fc,اتلانتا
New York City FC|نيويورك سيتي|nycfc,new york city,نيو يورك سيتي
New York Red Bulls|نيويورك ريد بولز|ny red bulls,red bulls,نيو يورك ريد بولز
Columbus Crew|كولومبوس كرو|columbus,crew
Portland Timbers|بورتلاند تيمبرز|portland,بورتلاند
Austin FC|أوستن|austin,اوستن`,
};
export const clubs = Object.entries(groups).flatMap(([country, rows]) => rows.split('\n').map((row, index) => {
  const [name, arabic, aliases = ''] = row.split('|');
  return { id: `${country}-${index}`, country, name, arabic, aliases: aliases.split(',').filter(Boolean), region: countries[country].region };
}));
