// https://afeld.github.io/emoji-css/
export const COUNTRIES: ValueName[] = [
    { value: 'city_sunset', name: 'Arrakén' },
    { value: 'bila_stolova_hora', name: 'Bílá stolová hora' },
    { value: 'bleda_planina', name: 'Bledá planina' },
    { value: 'imperialni_panev', name: 'Imperiální pánev' },
    { value: 'jizni_nepravy_val', name: 'Jižní nepravý val' },
    { value: 'jizni_planina', name: 'Jižní planina' },
    { value: 'kamenna_brada', name: 'Kamenná brada' },
    { value: 'kartago', name: 'Kartágo' },
    { value: 'maly_erg', name: 'Malý erg' },
    { value: 'nerovna_zeme', name: 'Nerovná země' },
    { value: 'panev_hagga', name: 'Pánev Hagga' },
    { value: 'snowflake', name: 'Polární čepička' },
    { value: 'predel_habbanya', name: 'Předěl Habbanya' },
    { value: 'prolaklina_cielago', name: 'Proláklina Cielago' },
    { value: 'prusmyk_harg', name: 'Průsmyk Harg' },
    { value: 'red_circle', name: 'Rudý jícen' },
    { value: 'sadrova_panev', name: 'Sádrová pánev' },
    { value: 'skalni_vychozy', name: 'Skalní výchozy' },
    { value: 'stara_prurva', name: 'Stará průrva' },
    { value: 'mountain', name: 'Štítový val' },
    { value: 'utes_sihaja', name: 'Útes Sihája' },
    { value: 'velka_rovina', name: 'Velká rovina' },
    { value: 'vetrny_prusmyk', name: 'Větrný průsmyk' },
    { value: 'vychodni_neprava_stena', name: 'Východní nepravá stěna' },
    { value: 'vykrojeny_utes', name: 'Vykrojený útes' },
    { value: 'zapadni_neprava_stena', name: 'Západní nepravá stěna' },
    { value: 'question', name: 'Jiné' }
]

export const ACTION_TYPES: ValueName[] = [
    { value: 'mission', name: "Mise" },
    { value: 'other', name: "Jiné" }
]
export const VISIBILITIES: ValueName[] = [
    { value: 'public', name: "Veřejná" },
    { value: 'covert', name: "Tajná vůči frakcím" },
    { value: 'private', name: "Tajná uvnitř frakce" }
]
export const VISIBILITIES_PRIMARY: ValueName[] = [
    { value: 'public', name: "Veřejná" },
    { value: 'covert', name: "Tajná vůči frakcím" }
]

export const TENSES: ValueName[] = [
    { value: 'past', name: "Proběhlo" },
    { value: 'processing', name: "Vyhodnocování" },
    { value: 'present', name: "Aktuální" },
    { value: 'future', name: "Budoucí" }
]
export const SIZES: ValueName[] = [
    { value: 'small', name: "Malé" },
    { value: 'large', name: "Velké" }
]
export const PROJECT_TYPES: ValueName[] = [
    { value: 'general', name: "Pro všechny" },
    { value: 'delegation', name: "Pro frakci" },
    { value: 'delegate', name: "Pro hráče" }
]

export const UNIT_TYPES: ValueName[] = [
    { value: 'active_hero', name: "Aktivní hrdina" },
    { value: 'passive_hero', name: "Pasivní hrdina" },
    { value: 'army', name: "Armáda" }
]

export const UNIT_STATES: ValueName[] = [
    { value: 'alive', name: "Živá" },
    { value: 'dead', name: "Mrtvá" },
    { value: 'incubating', name: "Objeví se" },
    { value: 'other', name: "Ostatní" }
]

export const UNIT_VISIBILITIES: ValueName[] = [
    { value: 'public', name: "Veřejná" },
    { value: 'private', name: "Soukromá" },
    { value: 'fremen', name: "Fremenská" }
]

export const ALL_QUESTIONS: ValueName[] = [
    { value: "mandat_sardaukaru", name: "Mandát sardaukarů" },
    { value: "zruseni_mandatu_sardaukaru", name: "Zrušení mandátu sardaukarů" },
    { value: "vyslani_vojsk_landsraadu", name: "Vyslání vojsk Landsraadu" },
    { value: "zmena_mandatu_vojsk_landsraadu", name: "Změna mandátu vojsk Landsraadu" },
    { value: "stazeni_vojska_landsraadu", name: "Stažení vojsk Landsraadu" },
    { value: "zrizeni_vysetrovaci_komise", name: "Zřízení vyšetřovací komise" },
    { value: "prerozdeleni_podilu_choam", name: "Přerozdělení podílů CHOAM" },
    { value: "uvaleni_embarga", name: "Uvalení embarga" },
    { value: "zruseni_embarga", name: "Zrušení embarga" },
    { value: "zmena_kvot", name: "Změna kvót" },
    { value: "jiny", name: "Jiný" },
    { value: "", name: "- Žádný -" }
]

export const QUESTION_TYPE_HLAS_LANDSRAADU: ValueName = { value: "hlas_landsradu", name: "Hlas Landsraadu" }

export interface ValueName {
    value: string;
    name: string;
}

export interface ValueNameWithQuestionType extends ValueName {
    roundId: string;
    hidden: boolean;
    questionType: string;
}

export function findValueName(rows: ValueName[], value: string) {
    if (value == undefined) return "N/A"
    let row = rows.find((row) => row.value == value)
    if (row == undefined) return "N/A"
    return row.name
}

export interface BooleanInputs {
    value: boolean,
    name: string
}

export const booleans: BooleanInputs[] = [{value: false, name: "NE"}, {value: true, name: "ANO"}]