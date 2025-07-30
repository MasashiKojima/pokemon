export const getALLPokemon = async (url) => {
  const response = await fetch(url);
  return await response.json();
};

export const getPokemon = async (url) => {
  const response = await fetch(url);
  return await response.json();
};

const getJapaneseName = (namesArray, fallbackName) => {
  const japaneseName = namesArray.find(
    (nameObj) => nameObj.language.name === "ja-Hrkt" || nameObj.language.name === "ja"
  );
  return japaneseName ? japaneseName.name : fallbackName;
};

export const getPokemonJapaneseName = async (pokemonId) => {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}/`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const speciesData = await response.json();
    return getJapaneseName(speciesData.names, speciesData.name);
  } catch (error) {
    return String(pokemonId);
  }
};

export const getTypeJapaneseName = async (typeUrl) => {
  try {
    const response = await fetch(typeUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const typeData = await response.json();
    return getJapaneseName(typeData.names, typeData.name);
  } catch (error) {
    return "不明";
  }
};

export const getAbilityJapaneseName = async (abilityUrl) => {
  try {
    const response = await fetch(abilityUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const abilityData = await response.json();
    return getJapaneseName(abilityData.names, abilityData.name);
  } catch (error) {
    return "不明";
  }
};

// 完全なポケモンデータ（日本語）を取得
export const getPokemonWithAllJapanese = async (pokemonUrl) => {
  try {
    const pokemonResponse = await fetch(pokemonUrl);
    if (!pokemonResponse.ok) throw new Error(`Pokemon API error! status: ${pokemonResponse.status}`);

    const pokemonData = await pokemonResponse.json();

    const [japaneseName, japaneseTypes, japaneseAbilities] = await Promise.all([
      getPokemonJapaneseName(pokemonData.id),

      Promise.all(
        pokemonData.types.map(async (typeInfo) => {
          const japaneseTypeName = await getTypeJapaneseName(typeInfo.type.url);
          return {
            ...typeInfo,
            type: {
              ...typeInfo.type,
              japaneseName: japaneseTypeName
            }
          };
        })
      ),

      Promise.all(
        pokemonData.abilities.map(async (abilityInfo) => {
          const japaneseAbilityName = await getAbilityJapaneseName(abilityInfo.ability.url);
          return {
            ...abilityInfo,
            ability: {
              ...abilityInfo.ability,
              japaneseName: japaneseAbilityName
            }
          };
        })
      )
    ]);

    return {
      ...pokemonData,
      japaneseName,
      types: japaneseTypes,
      abilities: japaneseAbilities
    };

  } catch (error) {
    throw error;
  }
};