const fake = `
enum fake__Locale {
    az
    cz
    de
    de_AT
    de_CH
    en
    en_AU
    en_BORK
    en_CA
    en_GB
    en_IE
    en_IND
    en_US
    en_au_ocker
    es
    es_MX
    fa
    fr
    fr_CA
    ge
    id_ID
    it
    ja
    ko
    nb_NO
    nep
    nl
    pl
    pt_BR
    ru
    sk
    sv
    tr
    uk
    vi
    zh_CN
    zh_TW
  }
  
  enum fake__Types {
    zipCode
    city
    streetName
    
    streetAddress
    secondaryAddress
    county
    country
    countryCode
    state
    stateAbbr
    latitude
    longitude
  
    colorName
    productCategory
    productName
    
    money
    productMaterial
    product
  
    companyName
    companyCatchPhrase
    companyBS
  
    dbColumn
    dbType
    dbCollation
    dbEngine
  
    
    pastDate
    
    futureDate
    
    recentDate
  
    financeAccountName
    financeTransactionType
    currencyCode
    currencyName
    currencySymbol
    bitcoinAddress
    internationalBankAccountNumber
    bankIdentifierCode
  
    hackerAbbr
    hackerPhrase
  
    
    imageUrl
    # An URL for an avatar
    avatarUrl
    
    email
    url
    domainName
    ipv4Address
    ipv6Address
    userAgent
    
    colorHex
    macAddress
    
    password
  
  
    lorem
  
    firstName
    lastName
    fullName
    jobTitle
  
    phoneNumber
  
    uuid
    word
    words
    locale
  
    filename
    mimeType
    fileExtension
    semver
  }
  
  enum fake__imageCategory {
    abstract
    animals
    business
    cats
    city
    food
    nightlife
    fashion
    people
    nature
    sports
    technics
    transport
  }
  
  enum fake__loremSize {
    word
    words
    sentence
    sentences
    paragraph
    paragraphs
  }
  
  input fake__color {
    red255: Int = 0
    green255: Int = 0
    blue255: Int = 0
  }
  
  input fake__options {
    
    useFullAddress: Boolean
    
    minMoney: Float
    
    maxMoney: Float
    
    decimalPlaces: Int
    
    imageWidth: Int
    
    imageHeight: Int
    
    imageCategory: fake__imageCategory
    
    randomizeImageUrl: Boolean
    
    emailProvider: String
    
    passwordLength: Int
    
    loremSize: fake__loremSize
    
    dateFormat: String
    
    baseColor: fake__color = { red255: 0, green255: 0, blue255: 0 }
  }
  
  directive @fake(type:fake__Types!, options: fake__options = {}, locale:fake__Locale) on FIELD_DEFINITION | SCALAR
  
  
  scalar examples__JSON
  directive @examples(values: [examples__JSON]!) on FIELD_DEFINITION | SCALAR
`;

export default fake;
