/**
 * Daily Trivia Collection - Ultra Extended Version
 * * Ukupno preko 350 stavki za maksimalnu raznolikost.
 */

export interface TriviaItem {
  icon: string;
  text: string;
}

/**
 * Programmer jokes - humor za developere i studente IT-a
 */
export const PROGRAMMER_JOKES: TriviaItem[] = [
  { icon: '😂', text: 'Zašto programeri preferiraju tamni mod? Jer ih buba privlači svijetlo!' },
  {
    icon: '🤣',
    text: 'Koliko programera treba da promijeni sijalicu? Nijedan, to je hardware problem!',
  },
  { icon: '😄', text: 'Zašto je JavaScript išao kod psihologa? Jer je imao previše callback-ova!' },
  { icon: '😆', text: 'Moj kod radi. Ne znam zašto. Moj kod ne radi. Ne znam zašto.' },
  { icon: '🤭', text: 'Postoje samo 10 tipova ljudi: oni koji razumiju binarno i oni koji ne.' },
  {
    icon: '😁',
    text: 'Programer je osoba koja rješava probleme za koje nisi znao da postoje na neobjašnjiv način.',
  },
  { icon: '🙃', text: 'Zašto je student zaspao na predavanju? Profesor je pričao o REST-u!' },
  { icon: '😅', text: 'Kafa + WiFi = produktivan dan. Kafa - WiFi = panika.' },
  {
    icon: '🐛',
    text: 'Programiranje je 10% kucanje i 90% buljenje u ekran pitajući se zašto ne radi.',
  },
  {
    icon: '🤖',
    text: 'Algoritam: Riječ koju developeri koriste kad ne žele objasniti svoj haos u kodu.',
  },
  { icon: '⌨️', text: 'Najkorišteniji programski jezik je psovanje tokom debugginga.' },
  { icon: '🕸️', text: 'Kako pauk programer pravi mrežu? On je Full-stack web developer.' },
  { icon: '💾', text: 'Ctrl+C i Ctrl+V su jedini razlog zašto sam završio fakultet.' },
  { icon: '🐍', text: 'Python je kao engleski, samo što te računar zapravo sluša.' },
  { icon: '☕', text: 'Java developer: Mašina koja pretvara kofein u kompleksne klase.' },
  { icon: '🕵️', text: 'Debugging: Biti detektiv u filmu gdje si ti i ubica i žrtva.' },
  { icon: '🏗️', text: 'CSS je super, dok ne pokušaš centrirati jedan div.' },
  { icon: '🔄', text: 'Šta radi programer na plaži? Gleda u "C" (sea).' },
  { icon: '🐧', text: 'Linux je besplatan samo ako tvoje vrijeme nema nikakvu vrijednost.' },
  { icon: '🍎', text: 'Zašto Apple nema Windows? Jer ne žele da im promaja odnese profit.' },
  { icon: '👻', text: 'Baza podataka bez backupa nije baza, nego kockarnica.' },
  { icon: '😱', text: 'Najkraća horor priča: "Merge conflict u 400 fajlova".' },
  { icon: '🤓', text: 'HTML nije programski jezik. Promijeni moje mišljenje.' },
  { icon: '🚗', text: 'Da su automobili kao softver, gasili bi se svakih 10km bez razloga.' },
  { icon: '🚢', text: 'Docker: "Na mom računaru radi" je sada zvanični shipping kontejner.' },
  { icon: '🚫', text: '404: Motivacija za jutarnje predavanje nije pronađena.' },
  {
    icon: '🔚',
    text: 'Frontend je šminka, Backend je mozak, a klijent je onaj koji traži nemoguće.',
  },
  { icon: '👾', text: 'To nije bug, to je nedokumentovana funkcija koja traži pažnju.' },
  {
    icon: '⏳',
    text: 'Internet Explorer je bio dovoljno hrabar da te pita da bude default browser.',
  },
  { icon: '☁️', text: 'Cloud ne postoji, to je samo tuđi kompjuter negdje u hladnoj sobi.' },
  { icon: '🔒', text: 'Moja lozinka je "netačno", pa kad zaboravim, sistem mi sam kaže šta je.' },
  { icon: '🧐', text: 'C++ je kao mađioničarski trik: svi vide rezultat, niko ne zna kako radi.' },
  { icon: '😵‍💫', text: 'Programer broji: 0, 1, 2, 3... Normalna osoba: 1, 2, 3...' },
  { icon: '🛠️', text: 'Ako radi, ne diraj. Zlatno pravilo inženjerstva.' },
  { icon: '📱', text: 'Aplikacija radi na mom telefonu. Klijent ima Nokiu 3310.' },
  { icon: '🫠', text: 'Kada tvoj kod radi iz prve: "Šta sam zaboravio?!"' },
  { icon: '🚶', text: 'Programer ne ide u šetnju, on vrši Garbage Collection svojih misli.' },
  { icon: '🏢', text: 'Junior: Piše kod. Senior: Briše kod.' },
  { icon: '🧪', text: 'Beta testiranje: Pustimo korisnike da nađu bugove koje smo mi ignorisali.' },
  { icon: '📦', text: 'npm install: Skida pola interneta da bi napravio dugme.' },
  { icon: '🌋', text: 'Kompajliranje koda: Savršeno vrijeme za kafu i odmor.' },
  { icon: '🧱', text: 'Legacy kod je kao stara zgrada - makneš ciglu, sve padne.' },
  { icon: '🚿', text: 'Najbolje ideje za kod dolaze pod tušem, nikad za tastaturom.' },
  { icon: '📡', text: 'Ping 999ms: Život u prošlosti.' },
  { icon: '🧬', text: 'Programeri ne stare, oni samo prelaze na noviju verziju.' },
  { icon: '🎤', text: 'Zašto je programer dobio otkaz? Jer nije imao git-u (gitaru).' },
  { icon: '🛸', text: 'AI će nas zamijeniti? Tek kad klijenti budu znali šta žele.' },
  { icon: '🚩', text: 'Red flag: "Ovo je jednostavan projekat, gotov za vikend".' },
  { icon: '🔥', text: 'Deployment u petak popodne je ekstremni sport.' },
  { icon: '💤', text: 'Programer spava 8 sati. Ukupno sedmično.' },
  { icon: '🎈', text: 'Floating point brojevi su razlog zašto matematika plače.' },
  { icon: '📐', text: 'Programiranje: 1% inspiracije, 99% kucanja po Stack Overflowu.' },
  { icon: '🚪', text: 'Exit strategy: Alt + F4.' },
  { icon: '⚡', text: 'Kada napišeš skriptu koja zamjenjuje 2 sata posla sa 30 sekundi koda.' },
  { icon: '🌑', text: 'Dark mode je jedini način na koji preživljavam zimu.' },
  { icon: '🚦', text: 'Semaforski sistem u kodu: zeleno radi, crveno panika.' },
  {
    icon: '🍫',
    text: 'Programeri jedu slatkiše da nadoknade glukozu koju mozak spali debagovanjem.',
  },
  { icon: '🎸', text: 'Rockstar developer? To je samo neko ko nema društveni život.' },
  { icon: '🪟', text: 'Windows: Dozvolite nam da restartujemo vaš PC usred prezentacije.' },
  { icon: '🦆', text: 'Rubber Duck debugging: Pričanje sa patkom je jeftinije od terapije.' },
  { icon: '🎭', text: 'Interface je ono što korisnik vidi, haos je ono što se dešava iza.' },
  { icon: '💣', text: 'Ne diraj taj dio koda, on drži cijeli internet na okupu.' },
  { icon: '🏗️', text: 'Refaktorisanje: Popravljanje nečega što nije pokvareno dok se ne pokvari.' },
  { icon: '🧺', text: 'Garbage Collector: Jedini koji čisti za mnom.' },
  { icon: '🧹', text: 'Komentari u kodu su kao znakovi na putu koje niko ne gleda.' },
  { icon: '🎢', text: 'Učenje novog frameworka je emocionalni rolerkoster.' },
  { icon: '🧊', text: 'Zamrzavanje ekrana: Najviši nivo meditacije.' },
  { icon: '📻', text: 'Radio dugme: Možeš izabrati samo jedno, kao i na ispitima.' },
  { icon: '🧨', text: 'Rekurzivna funkcija bez uslova prekida: Put u beskonačnost.' },
  { icon: '🗺️', text: 'Dokumentacija je mapa blaga, ali blago često nije tu.' },
  { icon: '🏹', text: 'C cilja tvoju nogu, C++ ti raznese cijelu nogu.' },
  { icon: '🌋', text: 'Kada ti laptop grije sobu bolje od radijatora.' },
  { icon: '🕯️', text: 'Programiranje uz svijeće jer ti je bug spržio osigurače.' },
  { icon: '🥪', text: 'Hardver je ono što možeš šutnuti, softver ono što možeš samo psovati.' },
  { icon: '📎', text: 'GitHub je Facebook za ljude koji ne vole ljude.' },
  { icon: '📜', text: 'JSON je najbolji prijatelj moderne komunikacije.' },
  { icon: '🔑', text: 'SSH ključevi su jedini ključevi koje ne gubim.' },
  { icon: '🧪', text: 'Unit test: Provjera da li 1+1 stvarno daje 2.' },
  { icon: '🧿', text: 'Programeri su moderni čarobnjaci koji kucaju čini.' },
  { icon: '🧬', text: 'RegEx je jezik koji niko ne zna čitati, čak ni onaj ko ga je napisao.' },
];

/**
 * Did you know facts - Zanimljive naučne i opšte činjenice
 */
export const DID_YOU_KNOW_FACTS: TriviaItem[] = [
  { icon: '🧠', text: 'Jesi znao? Mozak koristi 20% energije tijela iako je samo 2% mase!' },
  { icon: '💡', text: 'Jesi znao? Med nikada ne truli - nađen je jestiv med star 3000 godina!' },
  { icon: '🌍', text: 'Jesi znao? Zemlja rotira brzinom od 1670 km/h na ekvatoru!' },
  { icon: '🦑', text: 'Jesi znao? Hobotnice imaju tri srca i devet mozgova!' },
  { icon: '🌙', text: 'Jesi znao? Otisci stopala na Mjesecu će trajati barem 100 miliona godina.' },
  { icon: '🐝', text: 'Jesi znao? Pčele mogu prepoznati ljudska lica kao i mi.' },
  { icon: '🦩', text: 'Jesi znao? Flamingosi su roze jer se hrane račićima punim karotena.' },
  { icon: '⚡', text: 'Jesi znao? Munja je 5 puta toplija od površine Sunca!' },
  { icon: '🍌', text: 'Jesi znao? Banane su radioaktivne zbog visokog nivoa kalija.' },
  { icon: '🦈', text: 'Jesi znao? Ajkule su starije od drveća i Saturna!' },
  { icon: '🍓', text: 'Jesi znao? Jagoda je jedino voće čije sjemenke rastu spolja.' },
  { icon: '💧', text: 'Jesi znao? Skoro sva voda na Zemlji je reciklirana od doba dinosaurusa.' },
  { icon: '💤', text: 'Jesi znao? Delfini spavaju sa jednim otvorenim okom i pola mozga.' },
  { icon: '🐙', text: 'Jesi znao? Hobotnica može proći kroz rupu veličine svog oka.' },
  { icon: '🗼', text: 'Jesi znao? Eiffelov toranj može biti 15 cm viši ljeti zbog toplote.' },
  { icon: '🌌', text: 'Jesi znao? U svemiru ima više zvijezda nego zrna pijeska na Zemlji.' },
  { icon: '🐄', text: 'Jesi znao? Krave imaju "regionalne naglaske" u mukanju.' },
  { icon: '🐜', text: 'Jesi znao? Mravi nikada ne spavaju i nemaju pluća.' },
  { icon: '🦴', text: 'Jesi znao? Čovjek ima više kostiju pri rođenju nego kad odraste.' },
  { icon: '🐊', text: 'Jesi znao? Krokodili gutaju kamenje da bi lakše rone dublje.' },
  { icon: '💎', text: 'Jesi znao? Na Neptunu i Saturnu bukvalno padaju dijamanti.' },
  { icon: '🧂', text: 'Jesi znao? Rimski vojnici su nekada plaćani u soli (otud riječ Salary).' },
  {
    icon: '🥕',
    text: 'Jesi znao? Mrkve su nekada bile ljubičaste, narandžaste su uzgojene kasnije.',
  },
  { icon: '🐼', text: 'Jesi znao? Pande jedu bambus 12 sati dnevno da bi preživjele.' },
  { icon: '🐌', text: 'Jesi znao? Puž može da spava tri pune godine bez buđenja.' },
  { icon: '👃', text: 'Jesi znao? Tvoj nos može zapamtiti 50,000 različitih mirisa.' },
  { icon: '🍫', text: 'Jesi znao? Čokolada je nekada služila kao novac u carstvu Acteka.' },
  { icon: '🏔️', text: 'Jesi znao? Mount Everest raste oko 4 milimetra svake godine.' },
  { icon: '🦐', text: 'Jesi znao? Srce škampa se nalazi u njegovoj glavi.' },
  { icon: '🦠', text: 'Jesi znao? U ljudskom pupku živi čitav ekosistem od hiljada bakterija.' },
  { icon: '❄️', text: 'Jesi znao? Svaka snježna pahulja ima 6 krakova zbog molekula vode.' },
  { icon: '🐧', text: 'Jesi znao? Pingvini prosidbu vrše poklanjanjem najljepšeg kamenčića.' },
  { icon: '🐨', text: 'Jesi znao? Koale imaju otiske prstiju skoro identične ljudskim.' },
  { icon: '🍅', text: 'Jesi znao? Paradajz ima više gena nego ljudsko biće.' },
  { icon: '🌋', text: 'Jesi znao? Najveći vulkan u Sunčevom sistemu je na Marsu.' },
  { icon: '🦉', text: 'Jesi znao? Sove ne mogu pomicati očne jabučice.' },
  {
    icon: '🐿️',
    text: 'Jesi znao? Vjeverice svake godine posade hiljade stabala jer zaborave gdje su lješnjaci.',
  },
  { icon: '🐘', text: 'Jesi znao? Slonovi su jedine životinje koje ne mogu skočiti.' },
  { icon: '🐀', text: 'Jesi znao? Pacovi se zapravo smiju kada ih neko golica.' },
  { icon: '🦷', text: 'Jesi znao? Puževi imaju hiljade sitnih zuba na jeziku.' },
  { icon: '🌊', text: 'Jesi znao? 95% okeana je još uvijek neistraženo.' },
  { icon: '🦘', text: 'Jesi znao? Kenguri ne mogu hodati unazad.' },
  { icon: '🌳', text: 'Jesi znao? Drveće međusobno komunicira putem mreže gljivica u zemlji.' },
  {
    icon: '🥪',
    text: 'Jesi znao? Sendvič je dobio ime po Earlu od Sandwicha koji je volio kockati.',
  },
  { icon: '🥤', text: 'Jesi znao? Coca-Cola bi bila zelena da joj se ne dodaje boja.' },
  { icon: '🐈', text: 'Jesi znao? Mačke imaju preko 100 glasnih zvukova, psi samo oko 10.' },
  { icon: '🌓', text: 'Jesi znao? Mjesec se svake godine udaljava od Zemlje za 3.8 cm.' },
  {
    icon: '🫁',
    text: 'Jesi znao? Lijevo plućno krilo je manje od desnog da bi bilo mjesta za srce.',
  },
  { icon: '🕯️', text: 'Jesi znao? Plamen svijeće u svemiru je okrugao i plav.' },
  { icon: '🦜', text: 'Jesi znao? Papagaji daju imena svojim ptićima koja koriste cijeli život.' },
  { icon: '🦞', text: 'Jesi znao? Jastozi su teoretski besmrtni jer im ćelije ne stare normalno.' },
  { icon: '🪶', text: 'Jesi znao? Ptica kolibri je jedina koja može letjeti unazad.' },
  { icon: '☁️', text: 'Jesi znao? Prosječan oblak teži oko 500 tona.' },
  {
    icon: '🔋',
    text: 'Jesi znao? Prva baterija je izumljena prije 2000 godina u Bagdadu (navodno).',
  },
  { icon: '🍭', text: 'Jesi znao? Lizalo je izumljeno kao način da se lijek daje djeci.' },
  { icon: '🐪', text: 'Jesi znao? Kamile imaju tri kapka da se zaštite od pijeska.' },
  { icon: '🦋', text: 'Jesi znao? Leptiri osjećaju ukus svojim nogama.' },
  { icon: '🎢', text: 'Jesi znao? Prvi rolerkosteri su napravljeni od ruskih ledenih tobogana.' },
  { icon: '🪀', text: 'Jesi znao? Jo-jo je nekada korišten kao oružje na Filipinima.' },
  { icon: '♟️', text: 'Jesi znao? Postoji više mogućih partija šaha nego atoma u univerzumu.' },
  {
    icon: '🧲',
    text: 'Jesi znao? Zemljino magnetno polje se potpuno okrene svakih milion godina.',
  },
  {
    icon: '🎨',
    text: 'Jesi znao? Leonardo da Vinci je mogao pisati jednom rukom, a crtati drugom istovremeno.',
  },
  { icon: '🍄', text: 'Jesi znao? Najveći živi organizam na svijetu je gljiva u Oregonu.' },
  {
    icon: '🥇',
    text: 'Jesi znao? Zlatne medalje na Olimpijadi su uglavnom napravljene od srebra.',
  },
  { icon: '🚁', text: 'Jesi znao? Leonardo da Vinci je nacrtao nacrt helikoptera u 15. vijeku.' },
  { icon: '🚲', text: 'Jesi znao? Na svijetu ima više bicikala nego automobila.' },
  { icon: '🦂', text: 'Jesi znao? Škorpioni svijetle pod UV svjetlom.' },
  { icon: '🎾', text: 'Jesi znao? Teniske loptice su bile bijele do 1972. godine.' },
  { icon: '🚦', text: 'Jesi znao? Prvi semafor je postavljen u Londonu prije izuma automobila.' },
  {
    icon: '🪁',
    text: 'Jesi znao? Zmajevi (kite) su izumljeni u Kini za mjerenje udaljenosti vojske.',
  },
  {
    icon: '🪞',
    text: 'Jesi znao? Ogledalo zapravo ne okreće lijevo i desno, već naprijed i nazad.',
  },
  { icon: '🧊', text: 'Jesi znao? Topla voda se ledi brže od hladne (Mpemba efekat).' },
  { icon: '🍫', text: 'Jesi znao? Miris čokolade povećava teta moždane talase koji opuštaju.' },
  { icon: '🌩️', text: 'Jesi znao? Na svijetu se svake sekunde desi oko 100 udara munja.' },
  { icon: '🌓', text: 'Jesi znao? Na Mjesecu nema vjetra, zato otisci stopala ne nestaju.' },
  { icon: '🦥', text: 'Jesi znao? Ljenjivcima treba dvije sedmice da svare jedan obrok.' },
  { icon: '🦙', text: 'Jesi znao? Lame su rođaci kamila bez grba.' },
  { icon: '🦒', text: 'Jesi znao? Žirafe imaju isti broj vratnih pršljenova kao i ljudi (7).' },
  { icon: '🦁', text: 'Jesi znao? Lavlja rika se može čuti sa udaljenosti od 8 kilometara.' },
  { icon: '🌋', text: 'Jesi znao? Island je nastao vulkanskim erupcijama usred okeana.' },
];

/**
 * Productivity tips - Savjeti za učenje i organizaciju
 */
export const PRODUCTIVITY_TIPS: TriviaItem[] = [
  { icon: '📚', text: 'Produktivnost: 10 min organizacije ujutro štedi sat vremena tokom dana!' },
  { icon: '💤', text: 'Spavanje 7-9 sati poboljšava memoriju i koncentraciju za 40%!' },
  { icon: '🥤', text: 'Dehidracija od samo 2% smanjuje kognitivne sposobnosti za 25%!' },
  { icon: '🎵', text: 'Slušanje instrumentalne muzike (Lo-Fi) poboljšava fokus do 15%!' },
  { icon: '🚶', text: 'Kratka šetnja od 10 minuta može povećati kreativnost za 60%!' },
  { icon: '🌿', text: 'Biljke u sobi mogu smanjiti stres i poboljšati produktivnost.' },
  { icon: '😊', text: 'Osmijeh, čak i lažan, oslobađa endorfine i smanjuje pritisak.' },
  { icon: '🎯', text: 'Pomodoro: 25 min rada + 5 min pauze = tvoj mozak ostaje svjež.' },
  { icon: '🐸', text: 'Pojedi žabu: Najteži zadatak uradi prvi ujutro.' },
  { icon: '📱', text: 'Skloni telefon u drugu sobu. Sama vidljivost telefona smanjuje IQ.' },
  { icon: '⏱️', text: 'Pravilo 2 minute: Ako zadatak traje manje od 2 min, uradi ga odmah.' },
  { icon: '✍️', text: 'Zapisivanje ciljeva povećava šansu za njihov završetak za 42%.' },
  { icon: '🧘', text: 'Meditacija od 5 minuta resetuje mozak bolje od sata skrolanja.' },
  { icon: '🍎', text: 'Grickaj orahe ili borovnice dok učiš za bolju memoriju.' },
  { icon: '🏫', text: 'Feynmanova tehnika: Ako ne znaš objasniti djetetu, ne znaš gradivo.' },
  { icon: '🧹', text: 'Nered na stolu je nered u glavi. Sredi radni prostor.' },
  { icon: '📅', text: 'Planiraj sutrašnji dan večeras. Započni dan sa planom.' },
  { icon: '🎧', text: 'White noise pomaže kod blokiranja buke u domu/biblioteci.' },
  { icon: '📵', text: 'Isključi notifikacije. Svaki prekid te košta 20 minuta povratka u fokus.' },
  { icon: '🏋️', text: 'Fizička aktivnost povećava dotok kiseonika u mozak.' },
  { icon: '📖', text: 'Aktivno uči: Postavljaj sebi pitanja dok čitaš umjesto samo podvlačenja.' },
  { icon: '🔋', text: 'Power nap od 15 min je idealan za popodnevno osvježenje.' },
  { icon: '🚫', text: 'Multitasking je mit. Tvoj mozak samo brzo skače s teme na temu.' },
  { icon: '🧩', text: 'Razbij veliki ispit na 10 malih cjelina. Lakše je krenuti.' },
  { icon: '🏆', text: 'Nagradi se nakon svakog završenog cilja. Mozak voli dopamin.' },
  { icon: '🚪', text: 'Zatvori sve tabove koji nisu vezani za trenutni zadatak.' },
  { icon: '🥛', text: 'Pij vodu prije kafe. Mozak je 75% voda.' },
  { icon: '🚿', text: 'Hladan tuš ujutro dramatično povećava budnost bez kofeina.' },
  { icon: '📝', text: 'Piši bilješke rukom. Tako se informacije bolje procesiraju.' },
  { icon: '🕒', text: 'Prati svoj bioritam. Uči teže stvari kad imaš najviše energije.' },
  { icon: '🎨', text: 'Koristi boje. Naš mozak lakše pamti šarene informacije.' },
  { icon: '🫂', text: 'Objasni kolegama šta si naučio. To je najbolji test znanja.' },
  { icon: '🛋️', text: 'Nemoj učiti u krevetu. Mozak će krevet povezati sa stresom umjesto snom.' },
  { icon: '🕯️', text: 'Miris limuna ili mente dokazano poboljšava koncentraciju.' },
  { icon: '📊', text: 'Koristi 80/20 pravilo: 20% gradiva nosi 80% bodova na ispitu.' },
  { icon: '🧪', text: 'Mijenjaj predmete svakih sat vremena da izbjegneš zasićenje.' },
  { icon: '🦢', text: 'Budi nježan prema sebi. Produktivnost nije samo rad, nego i odmor.' },
  { icon: '🗄️', text: 'Digitalni minimalizam: Obriši nepotrebne fajlove sa desktopa.' },
  { icon: '☀️', text: 'Izađi na sunce bar 15 minuta. Vitamin D je ključan za fokus.' },
  { icon: '🏗️', text: 'Gradi naviku, a ne oslanjaj se na motivaciju.' },
  { icon: '📉', text: 'Smanji očekivanja za početak. Samo otvori knjigu na 5 minuta.' },
  { icon: '🧲', text: 'Okruži se ljudima koji uče. Produktivnost je zarazna.' },
  { icon: '📌', text: 'Koristi ljepljive bilješke za najbitnije formule oko monitora.' },
  { icon: '🔍', text: 'Prije učenja preleti naslove. Mozak voli imati kontekst.' },
  { icon: '🗣️', text: 'Snimi sebe kako čitaš definicije i slušaj u busu.' },
  { icon: '🧘', text: 'Duboko diši 2 minute prije početka učenja za smanjenje kortizola.' },
  { icon: '🪟', text: 'Provjetri sobu. Više kiseonika znači brži rad mozga.' },
  { icon: '🍵', text: 'Zeleni čaj daje stabilniju energiju od kafe.' },
  { icon: '🌑', text: 'Koristi Night Shift mod na ekranu naveče da ne kvariš san.' },
  { icon: '🛑', text: 'Znaš kad trebaš stati. Pregorijevanje nije produktivnost.' },
  { icon: '🧊', text: 'Drži hladnu vodu pri ruci. Pomaže ti da ostaneš prisutan.' },
  { icon: '🧗', text: 'Učenje je maraton, a ne sprint. Doziraj snagu.' },
  { icon: '🛤️', text: 'Koristi aplikacije za blokiranje društvenih mreža tokom učenja.' },
  { icon: '🎭', text: 'Vizualizuj uspjeh. Zamisli osjećaj kad položiš ispit.' },
  { icon: '🪁', text: 'Dozvoli sebi "dosadu". Tada dolaze najbolje ideje.' },
  { icon: '🧸', text: 'Uči u sesijama od 50 minuta sa 10 minuta pauze.' },
  { icon: '🛒', text: 'Pripremi zdrave grickalice unaprijed da ne posežeš za junk foodom.' },
  { icon: '🔦', text: 'Fokusiraj se na jednu stvar. multitasking uništava duboki rad.' },
  { icon: '🕯️', text: 'Uključi tihu muziku bez teksta ako ti je soba previše tiha.' },
  { icon: '📪', text: 'Provjeravaj email/poruke samo u određeno vrijeme.' },
  {
    icon: '🦢',
    text: 'Pravilo 5 sekundi: Ako imaš ideju, kreni u roku od 5s ili će te mozak odgovoriti.',
  },
  { icon: '🗝️', text: 'Tvoja pažnja je tvoja valuta. Troši je pametno.' },
  { icon: '🔨', text: 'Uradi prvo ono što najviše odgađaš.' },
  { icon: '🧼', text: 'Operi lice hladnom vodom kad osjetiš pad energije.' },
  { icon: '🕯️', text: 'Podesi osvjetljenje. Preslabo svjetlo te uspavljuje.' },
  { icon: '🎈', text: 'Slavi male pobjede. Svaka naučena stranica je korak naprijed.' },
  { icon: '📜', text: 'Pravi mape uma umjesto dugačkih tekstualnih bilješki.' },
  { icon: '🧬', text: 'Poveži novo znanje sa onim što već znaš.' },
  { icon: '🧠', text: 'Uči pred spavanje. Mozak procesuira informacije dok spavaš.' },
  { icon: '🚶', text: 'Šetaj dok ponavljaš gradivo naglas.' },
  { icon: '🕰️', text: 'Cijeni svoje slobodno vrijeme jednako kao i vrijeme za učenje.' },
  { icon: '🧱', text: 'Dosljednost je važnija od intenziteta.' },
  { icon: '🧪', text: 'Testiraj se često. Testiranje je bolja metoda od pukog čitanja.' },
  { icon: '💎', text: 'Kvalitet učenja je bitniji od broja sati provedenih uz knjigu.' },
  { icon: '🔋', text: 'Tvoja energija je ograničena. Ne troši je na nebitne svađe.' },
  { icon: '🌌', text: 'Gledaj u daljinu svakih 20 minuta da odmoriš očne mišiće.' },
  { icon: '🌱', text: 'Svaki dan nauči bar jednu novu riječ ili koncept.' },
  { icon: '🏆', text: 'Završi dan sa listom pobjeda, a ne samo listom obaveza.' },
  { icon: '🔭', text: 'Gledaj širu sliku. Zašto zapravo studiraš ovo?' },
  { icon: '🪄', text: 'Pretvori učenje u igru. Postavljaj sebi izazove.' },
];

/**
 * Motivational quotes - Inspiracija za studente
 */
export const MOTIVATIONAL_QUOTES: TriviaItem[] = [
  { icon: '💪', text: 'Svaki ekspert je nekada bio početnik. Samo nastavi!' },
  { icon: '🌟', text: 'Uspjeh nije konačan, neuspjeh nije fatalan. Hrabrost se računa.' },
  { icon: '✨', text: 'Danas je savršen dan da naučiš nešto što juče nisi znao.' },
  { icon: '🚀', text: 'Tvoj jedini limit je tvoj um. Probij te granice!' },
  { icon: '🔥', text: 'Male dnevne pobjede vode do ogromnih rezultata.' },
  { icon: '💎', text: 'Pritisak stvara dijamante. Izdrži još malo!' },
  { icon: '🎓', text: 'Znanje je jedina stvar koju ti niko nikada ne može oduzeti.' },
  { icon: '🏆', text: 'Ne broji dane, učini da tvoji dani vrijede.' },
  { icon: '🌱', text: 'Ne moraš biti savršen da bi počeo, ali moraš početi da bi uspio.' },
  { icon: '🦁', text: 'Budi jači od svojih najjačih izgovora.' },
  { icon: '🧗', text: 'Teški usponi vode do najljepših vidikovaca.' },
  { icon: '⏰', text: 'Za godinu dana ćeš poželjeti da si počeo baš danas.' },
  { icon: '🧱', text: 'Uspjeh se gradi ciglu po ciglu, dan po dan.' },
  { icon: '🌈', text: 'Oluja će proći, a ti ćeš izaći jači i spremniji.' },
  { icon: '💫', text: 'Ciljaj visoko. Čak i ako ne stigneš do vrha, bit ćeš visoko.' },
  { icon: '🔋', text: 'Odmor je dio procesa, a ne znak slabosti.' },
  { icon: '📚', text: 'Investicija u sebe se isplaćuje cijeli život.' },
  { icon: '🚧', text: 'Prepreke su samo test koliko zapravo želiš svoj cilj.' },
  { icon: '🔨', text: 'Gradi svoju budućnost, ili ćeš raditi na tuđoj.' },
  { icon: '👣', text: 'Svaki veliki put počinje jednim malim, nesigurnim korakom.' },
  { icon: '🦅', text: 'Tvoj stav određuje tvoju visinu leta.' },
  { icon: '💡', text: 'Budi svjetlo koje želiš vidjeti u drugima.' },
  { icon: '⚓', text: 'Mirno more ne stvara vješte kapetane.' },
  { icon: '🥇', text: 'Tvoj jedini rival je osoba koja si bio juče.' },
  { icon: '🔑', text: 'Disciplina je ključ koji otvara sva vrata uspjeha.' },
  { icon: '⛰️', text: 'Najbolji pogled je sa vrha planine na koju si se sam popeo.' },
  { icon: '🦋', text: 'Promjena je teška na početku, ali prelijepa na kraju.' },
  { icon: '🎯', text: 'Fokusiraj se na korak ispred sebe, ne na cijelu planinu.' },
  { icon: '🕯️', text: 'Dovoljno je da osvijetliš samo metar ispred sebe da bi krenuo.' },
  { icon: '🎢', text: 'Život je 10% događaja i 90% tvoje reakcije na njih.' },
  { icon: '🧠', text: 'Mozak je mišić. Što ga više koristiš, to je jači.' },
  { icon: '🛤️', text: 'Ne gledaj na sat. Samo nastavi da se krećeš.' },
  { icon: '🌺', text: 'Vjeruj u svoje mogućnosti čak i kad drugi sumnjaju.' },
  { icon: '🛑', text: 'Nikada ne odustaj od nečega o čemu razmišljaš svaki dan.' },
  { icon: '⚡', text: 'Ti si tvoj najveći projekat. Radi na sebi.' },
  { icon: '🌊', text: 'Budi kao voda. Prilagodi se prepreci i nastavi teći.' },
  { icon: '🔭', text: 'Gledaj u zvijezde, ali drži noge čvrsto na zemlji.' },
  { icon: '🏹', text: 'Da bi strijela poletjela naprijed, mora biti povučena nazad.' },
  { icon: '🛠️', text: 'Sreća je ono što se desi kada se priprema sretne sa šansom.' },
  { icon: '🌞', text: 'Svako jutro je nova prilika da ispraviš jučerašnje greške.' },
  { icon: '🧩', text: 'Ti si jedini dio slagalice koji fali tvojoj budućnosti.' },
  { icon: '🏰', text: 'Tvoji snovi nemaju rok trajanja. Duboko udahni i pokušaj ponovo.' },
  { icon: '🗡️', text: 'Ono što te ne slomi, definitivno te ojača.' },
  { icon: '🛸', text: 'Budi toliko dobar da te ne mogu ignorisati.' },
  { icon: '💎', text: 'Tvoj potencijal je beskonačan, samo ga trebaš otključati.' },
  { icon: '🌬️', text: 'Pusti ono što ne možeš kontrolisati i fokusiraj se na ono što možeš.' },
  { icon: '🌻', text: 'Okreni se prema suncu i sjenke će ostati iza tebe.' },
  { icon: '🔋', text: 'Napuniti baterije nije gubitak vremena, nego nužnost.' },
  { icon: '🪁', text: 'Mašta je važnija od znanja, jer znanje ima granice.' },
  { icon: '🪵', text: 'Iz male iskre nastaje veliki požar. Tvoja ideja je ta iskra.' },
  { icon: '🛤️', text: 'Uspjeh nije odredište, nego način putovanja.' },
  { icon: '🏆', text: 'Pobjednici su gubitnici koji su probali još samo jednom.' },
  { icon: '🕯️', text: 'Tvoje svjetlo ne gubi na snazi ako zapališ tuđu svijeću.' },
  { icon: '🌊', text: 'Kapljica dubi kamen ne snagom, već upornošću.' },
  { icon: '🦉', text: 'Budi mudar. Biraj svoje bitke pažljivo.' },
  { icon: '🛡️', text: 'Tvoj um je tvoja tvrđava. Brani je od negativnih misli.' },
  { icon: '🐚', text: 'Unutar tebe se krije biser, samo trebaš zaroniti duboko.' },
  { icon: '🌋', text: 'Neka tvoja strast bude glasnija od tvog straha.' },
  { icon: '🪜', text: 'Svaki neuspjeh je samo još jedna stepenica ka gore.' },
  { icon: '🎡', text: 'Život je krug. Sve što uložiš, vratiće ti se.' },
  { icon: '🦸', text: 'Budi heroj svoje priče, a ne sporedni lik u tuđoj.' },
  { icon: '🍂', text: 'Čak i drveće pušta lišće da bi moglo ponovo rasti.' },
  { icon: '🥊', text: 'Nije bitno koliko puta padneš, nego koliko brzo ustaneš.' },
  { icon: '🔔', text: 'Vrijeme je tvoj najvredniji resurs. Ne troši ga uzalud.' },
  { icon: '🛶', text: 'Ti upravljaš svojim čamcem, ne dozvoli da te struja nosi.' },
  { icon: '🎇', text: 'Tvoj rad će se isplatiti. Možda ne danas, ali hoće.' },
  { icon: '🦁', text: 'Tišina je nekada najjači krik ambicije.' },
  { icon: '🌑', text: 'Samo u potpunom mraku se vide najsjajnije zvijezde.' },
  { icon: '🧿', text: 'Vjeruj u proces čak i kad ga ne razumiješ potpuno.' },
  { icon: '🧪', text: 'Život je eksperiment. Što više probaš, to bolje.' },
  { icon: '🧬', text: 'Rođen si da budeš originalan, ne kopija.' },
  { icon: '🎈', text: 'Pusti sve što te vuče prema dole.' },
  { icon: '🧺', text: 'Sakupljaj trenutke, a ne stvari.' },
  { icon: '🕰️', text: 'Nikad nije kasno da postaneš ono što si mogao biti.' },
  { icon: '🎨', text: 'Oboji svoj svijet bojama kojima ti želiš.' },
  { icon: '⛰️', text: 'Planine koje nosiš, trebalo je samo da pređeš.' },
  { icon: '🔥', text: 'Gori od želje, ne od pregorijevanja.' },
  { icon: '🧭', text: 'Tvoje srce je tvoj najbolji kompas.' },
  { icon: '💡', text: 'Jedna dobra ideja može promijeniti sve.' },
  { icon: '🏰', text: 'Gradi dvorce u vazduhu, ali im napravi čvrste temelje.' },
];

/**
 * Combined collection of all trivia items
 */
export const FULL_TRIVIA_COLLECTION: TriviaItem[] = [
  ...PROGRAMMER_JOKES,
  ...DID_YOU_KNOW_FACTS,
  ...PRODUCTIVITY_TIPS,
  ...MOTIVATIONAL_QUOTES,
];

/**
 * Get a random trivia item from the full collection
 */
export function getRandomTrivia(): TriviaItem {
  const randomIndex = Math.floor(Math.random() * FULL_TRIVIA_COLLECTION.length);
  return FULL_TRIVIA_COLLECTION[randomIndex];
}

/**
 * Get a random trivia item from a specific category
 */
export function getRandomTriviaByCategory(
  category: 'jokes' | 'facts' | 'tips' | 'motivation'
): TriviaItem {
  let collection: TriviaItem[];

  switch (category) {
    case 'jokes':
      collection = PROGRAMMER_JOKES;
      break;
    case 'facts':
      collection = DID_YOU_KNOW_FACTS;
      break;
    case 'tips':
      collection = PRODUCTIVITY_TIPS;
      break;
    case 'motivation':
      collection = MOTIVATIONAL_QUOTES;
      break;
    default:
      collection = FULL_TRIVIA_COLLECTION;
  }

  const randomIndex = Math.floor(Math.random() * collection.length);
  return collection[randomIndex];
}

/**
 * Get a random trivia item with gender-aware text
 * Converts "Jesi znao?" to "Jesi znala?" for female users
 */
export function getRandomTriviaForGender(gender: 'musko' | 'zensko' | undefined): TriviaItem {
  const trivia = getRandomTrivia();

  if (gender === 'zensko') {
    return {
      ...trivia,
      text: trivia.text
        .replace(/Jesi znao\?/gi, 'Jesi znala?')
        .replace(/jesi znao\?/gi, 'jesi znala?'),
    };
  }

  return trivia;
}

/**
 * Get a random trivia item from a specific category with gender-aware text
 */
export function getRandomTriviaByCategoryForGender(
  category: 'jokes' | 'facts' | 'tips' | 'motivation',
  gender: 'musko' | 'zensko' | undefined
): TriviaItem {
  const trivia = getRandomTriviaByCategory(category);

  if (gender === 'zensko') {
    return {
      ...trivia,
      text: trivia.text
        .replace(/Jesi znao\?/gi, 'Jesi znala?')
        .replace(/jesi znao\?/gi, 'jesi znala?'),
    };
  }

  return trivia;
}
