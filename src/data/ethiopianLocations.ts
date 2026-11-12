export interface EthiopianLocationData {
  region: string;
  regionAmharic: string;
  woredas: {
    name: string;
    nameAmharic: string;
    cities: string[];
  }[];
}

export const ETHIOPIAN_REGIONS: EthiopianLocationData[] = [
  {
    region: 'Addis Ababa',
    regionAmharic: 'አዲስ አበባ',
    woredas: [
      { name: 'Bole', nameAmharic: 'ቦሌ', cities: ['Bole Medhanialem', 'Bole Atlas', 'Gerji', 'Rwanda', 'Bole Bulbula'] },
      { name: 'Kirkos', nameAmharic: 'ቂርቆስ', cities: ['Kazanchis', 'Meskel Square', 'Gotera', 'Beklo Bet', 'Olympia'] },
      { name: 'Yeka', nameAmharic: 'የካ', cities: ['Megenagna', 'Kotebe', 'Ferensay Legasion', 'Signal', 'Kara'] },
      { name: 'Arada', nameAmharic: 'አራዳ', cities: ['Piassa', '4 Kilo', '6 Kilo', 'Goro', 'Somali Tera'] },
      { name: 'Lideta', nameAmharic: 'ልደታ', cities: ['Mexico', 'Balcha', 'Abinet', 'Teklehaymanot', 'Tor Hailoch'] },
      { name: 'Nifas Silk-Lafto', nameAmharic: 'ንፋስ ስልክ ላፍቶ', cities: ['Saris', 'Jemo', 'Lafto', 'Lebu', 'Mekanisa'] },
      { name: 'Kolfe Keranio', nameAmharic: 'ኮልፌ ቀራኒዮ', cities: ['Total', 'Zenebework', 'Alem Bank', 'Keranio'] },
      { name: 'Gulele', nameAmharic: 'ጉለሌ', cities: ['Shiro Meda', 'Semien Mazegaja', 'Addisu Gebeya', 'Kuskuam'] },
      { name: 'Akaki Kality', nameAmharic: 'አቃቂ ቃሊቲ', cities: ['Kality Center', 'Akaki Beseka', 'Koye Feche', 'Gelam'] },
      { name: 'Addis Ketema', nameAmharic: 'አዲስ ከተማ', cities: ['Merkato', 'Autobus Tera', 'Amanuel', 'Sebategna'] },
      { name: 'Lemi Kura', nameAmharic: 'ለሚ ኩራ', cities: ['CMC', 'Ayat', 'Meri Luke', 'Summit', 'Yerer'] }
    ]
  },
  {
    region: 'Oromia',
    regionAmharic: 'ኦሮሚያ',
    woredas: [
      { name: 'Adama Woreda', nameAmharic: 'አዳማ', cities: ['Adama', 'Wonji', 'Awash Melkasa'] },
      { name: 'Bishoftu', nameAmharic: 'ቢሾፍቱ', cities: ['Bishoftu', 'Babogaya', 'Hora'] },
      { name: 'Sheger City', nameAmharic: 'ሸገር ከተማ', cities: ['Burayu', 'Sululta', 'Sebeta', 'Dukem', 'Legetafo'] },
      { name: 'Jimma', nameAmharic: 'ጅማ', cities: ['Jimma Town', 'Manna', 'Gomma'] },
      { name: 'Shashemene', nameAmharic: 'ሻሸመኔ', cities: ['Shashemene Town', 'Kuyera', 'Arsi Negele'] },
      { name: 'Nekemte', nameAmharic: 'ነቀምቴ', cities: ['Nekemte Town', 'Guto Gida'] },
      { name: 'Ambo', nameAmharic: 'አምቦ', cities: ['Ambo Town', 'Guder', 'Ginde Beret'] },
      { name: 'Asella', nameAmharic: 'አሰላ', cities: ['Asella Town', 'Tiyo', 'Bekoji'] },
      { name: 'Batu (Ziway)', nameAmharic: 'ባቱ (ዝዋይ)', cities: ['Batu Town', 'Adamitulu'] }
    ]
  },
  {
    region: 'Amhara',
    regionAmharic: 'አማራ',
    woredas: [
      { name: 'Bahir Dar Zuria', nameAmharic: 'ባህር ዳር ዙሪያ', cities: ['Bahir Dar', 'Tis Abay', 'Zenzelma'] },
      { name: 'Gondar Zuria', nameAmharic: 'ጎንደር ዙሪያ', cities: ['Gondar Town', 'Azezo', 'Dabat'] },
      { name: 'Dessie Zuria', nameAmharic: 'ደሴ ዙሪያ', cities: ['Dessie Town', 'Kombolcha', 'Kutaber'] },
      { name: 'Debre Birhan', nameAmharic: 'ደብረ ብርሃን', cities: ['Debre Birhan Town', 'Basona Werana', 'Ankober'] },
      { name: 'Debre Markos', nameAmharic: 'ደብረ ማርቆስ', cities: ['Debre Markos Town', 'Gozamin', 'Finote Selam'] },
      { name: 'Woldia', nameAmharic: 'ወልዲያ', cities: ['Woldia Town', 'Kobo', 'Lalibela'] }
    ]
  },
  {
    region: 'Tigray',
    regionAmharic: 'ትግራይ',
    woredas: [
      { name: 'Mekelle', nameAmharic: 'መቀሌ', cities: ['Mekelle Town', 'Hawelti', 'Ayder', 'Quiha', 'Adi Haki'] },
      { name: 'Adigrat', nameAmharic: 'ዓዲግራት', cities: ['Adigrat Town', 'Ganta Afeshum', 'Zalambessa'] },
      { name: 'Axum', nameAmharic: 'አክሱም', cities: ['Axum Town', 'Laelay Maychew', 'Adwa'] },
      { name: 'Shire Endaselassie', nameAmharic: 'ሽሬ እንዳስላሴ', cities: ['Shire Town', 'Selekleka', 'Sheraro'] },
      { name: 'Maychew', nameAmharic: 'ማይጨው', cities: ['Maychew Town', 'Alamata', 'Korem'] }
    ]
  },
  {
    region: 'Sidama',
    regionAmharic: 'ሲዳማ',
    woredas: [
      { name: 'Hawassa Zuria', nameAmharic: 'ሀዋሳ ዙሪያ', cities: ['Hawassa City', 'Chefe', 'Menahariya', 'Tabor'] },
      { name: 'Aleta Wendo', nameAmharic: 'አለታ ወንዶ', cities: ['Aleta Wendo Town', 'Wendo Genet'] },
      { name: 'Yirgalem', nameAmharic: 'ይርጋለም', cities: ['Yirgalem Town', 'Dale'] },
      { name: 'Leku', nameAmharic: 'ለኩ', cities: ['Leku Town', 'Shebedino'] }
    ]
  },
  {
    region: 'Dire Dawa',
    regionAmharic: 'ድሬዳዋ',
    woredas: [
      { name: 'Sabian', nameAmharic: 'ሳቢያን', cities: ['Sabian', 'Ashawa', 'Depot'] },
      { name: 'Melka Jebdu', nameAmharic: 'መልካ ጀብዱ', cities: ['Melka Jebdu', 'Gende Gerada'] },
      { name: 'Gende Kore', nameAmharic: 'ገንደ ቆሬ', cities: ['Gende Kore', 'Kefira'] },
      { name: 'Legehare', nameAmharic: 'ለገሃሬ', cities: ['Dire Dawa Center', 'Legehare'] }
    ]
  },
  {
    region: 'Somali',
    regionAmharic: 'ሶማሌ',
    woredas: [
      { name: 'Jigjiga', nameAmharic: 'ጅግጅጋ', cities: ['Jigjiga City', 'Tog Wajale', 'Chinaksen'] },
      { name: 'Gode', nameAmharic: 'ጎዴ', cities: ['Gode Town', 'Kelafo'] },
      { name: 'Degehabur', nameAmharic: 'ደገሀቡር', cities: ['Degehabur Town', 'Birkod'] },
      { name: 'Kebri Dahar', nameAmharic: 'ቀብሪ ደሀር', cities: ['Kebri Dahar Town', 'Shilavo'] }
    ]
  },
  {
    region: 'Afar',
    regionAmharic: 'አፋር',
    woredas: [
      { name: 'Semera', nameAmharic: 'ሰመራ', cities: ['Semera City', 'Logia', 'Dubti'] },
      { name: 'Awash', nameAmharic: 'አዋሽ', cities: ['Awash Sebat Kilo', 'Awash Arba'] },
      { name: 'Asaita', nameAmharic: 'አሳይታ', cities: ['Asaita Town', 'Afambo'] },
      { name: 'Mille', nameAmharic: 'ሚሌ', cities: ['Mille Town', 'Chifra'] }
    ]
  },
  {
    region: 'Benishangul-Gumuz',
    regionAmharic: 'ቤንሻንጉል ጉሙዝ',
    woredas: [
      { name: 'Assosa', nameAmharic: 'አሶሳ', cities: ['Assosa Town', 'Khomosha'] },
      { name: 'Bambasi', nameAmharic: 'ባምባሲ', cities: ['Bambasi Town', 'Menge'] },
      { name: 'Metekel', nameAmharic: 'መተከል', cities: ['Gilgel Beles', 'Pawe', 'Mandura'] }
    ]
  },
  {
    region: 'Gambela',
    regionAmharic: 'ጋምቤላ',
    woredas: [
      { name: 'Gambela Zuria', nameAmharic: 'ጋምቤላ ዙሪያ', cities: ['Gambela Town', 'Baro'] },
      { name: 'Itang', nameAmharic: 'ኢታንግ', cities: ['Itang Special Woreda'] },
      { name: 'Abobo', nameAmharic: 'አቦቦ', cities: ['Abobo Town', 'Gog'] }
    ]
  },
  {
    region: 'Harari',
    regionAmharic: 'ሐረሪ',
    woredas: [
      { name: 'Jugol (Historical)', nameAmharic: 'ጁጎል', cities: ['Harar Old Town', 'Amir Nur'] },
      { name: 'Abadir', nameAmharic: 'አባዲር', cities: ['Abadir', 'Shenkor', 'Hakim'] }
    ]
  },
  {
    region: 'Central Ethiopia',
    regionAmharic: 'ማዕከላዊ ኢትዮጵያ',
    woredas: [
      { name: 'Hossana', nameAmharic: 'ሆሳዕና', cities: ['Hossana City', 'Lemo', 'Gombora'] },
      { name: 'Butajira', nameAmharic: 'ቡታጅራ', cities: ['Butajira Town', 'Meskan', 'Mareko'] },
      { name: 'Wolkite', nameAmharic: 'ወልቂጤ', cities: ['Wolkite Town', 'Gubre', 'Cheha'] },
      { name: 'Durame', nameAmharic: 'ዱራሜ', cities: ['Durame Town', 'Kembata'] },
      { name: 'Halaba', nameAmharic: 'ሀላባ', cities: ['Halaba Kulito'] }
    ]
  },
  {
    region: 'South Ethiopia',
    regionAmharic: 'ደቡብ ኢትዮጵያ',
    woredas: [
      { name: 'Wolaita Sodo', nameAmharic: 'ወላይታ ሶዶ', cities: ['Sodo Town', 'Areka', 'Boditi'] },
      { name: 'Arba Minch Zuria', nameAmharic: 'አርባ ምንጭ', cities: ['Arba Minch Town', 'Sikela', 'Shecha'] },
      { name: 'Dilla', nameAmharic: 'ዲላ', cities: ['Dilla Town', 'Yirgacheffe', 'Wonago'] },
      { name: 'Jinka', nameAmharic: 'ጂንካ', cities: ['Jinka Town', 'South Omo'] },
      { name: 'Sawla', nameAmharic: 'ሳውላ', cities: ['Sawla Town', 'Gofa'] }
    ]
  },
  {
    region: 'Southwest Ethiopia',
    regionAmharic: 'ደቡብ ምዕራብ ኢትዮጵያ',
    woredas: [
      { name: 'Bonga', nameAmharic: 'ቦንጋ', cities: ['Bonga Town', 'Kaffa Zone'] },
      { name: 'Mizan Teferi', nameAmharic: 'ሚዛን ተፈሪ', cities: ['Mizan Aman', 'Bench Sheko'] },
      { name: 'Tepi', nameAmharic: 'ተፒ', cities: ['Tepi Town', 'Yeki'] },
      { name: 'Tercha', nameAmharic: 'ተርቻ', cities: ['Tercha Town', 'Dawro Zone'] }
    ]
  }
];
