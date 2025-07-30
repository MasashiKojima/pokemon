import { useEffect, useState } from "react";
import "./App.css";
import Card from "./components/Card/Card.js";
import Navbar from "./components/Navbar/Navbar.js";
import { getALLPokemon, getPokemon, getPokemonWithAllJapanese } from "./utils/pokemon.js";

function App() {
  const initialURL = "https://pokeapi.co/api/v2/pokemon";
  const [loading, setLoading] = useState(true);
  const [pokemonData, setPokemonData] = useState([]);
  const [allPokemonData, setAllPokemonData] = useState([]);
  const [currentPageData, setCurrentPageData] = useState([]);
  const [nextURL, setNextURL] = useState("");
  const [prevURL, setPrevURL] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    const fetchPokemonData = async () => {
      let res = await getALLPokemon(initialURL);
      const loadedPokemon = await loadPokemon(res.results);
      setAllPokemonData(loadedPokemon);
      setCurrentPageData(loadedPokemon);
      setNextURL(res.next);
      setPrevURL(res.previous);
      setLoading(false);
    };
    fetchPokemonData();
  }, []);

  const loadPokemon = async (data) => {
    let _pokemonData = await Promise.all(
      data.map(async (pokemon) => {
        let pokemonRecord = await getPokemonWithAllJapanese(pokemon.url);
        return pokemonRecord;
      })
    );
    setPokemonData(_pokemonData);
    return _pokemonData;
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleNextPage = async () => {
    if (isSearching) return;

    setLoading(true);
    let data = await getALLPokemon(nextURL);
    const loadedPokemon = await loadPokemon(data.results);
    setAllPokemonData(prev => [...prev, ...loadedPokemon]);
    setCurrentPageData(loadedPokemon);
    setNextURL(data.next);
    setPrevURL(data.previous);
    setLoading(false);
    scrollToTop();
  };

  const handlePrevPage = async () => {
    if (!prevURL || isSearching) return;

    setLoading(true);
    let data = await getALLPokemon(prevURL);
    const loadedPokemon = await loadPokemon(data.results);
    setCurrentPageData(loadedPokemon);
    setNextURL(data.next);
    setPrevURL(data.previous);
    setLoading(false);
    scrollToTop();
  };

  // ポケモン名の正規化（ひらがな・カタカナ対応）
  const normalizeText = (text) => {
    if (!text) return "";
    // カタカナをひらがなに変換
    return text.replace(/[\u30a1-\u30f6]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - 0x60);
    });
  };

  const searchInRange = async (searchTerm, startId = 1, endId = 151) => {
    setSearchLoading(true);

    try {
      const normalizedSearchTerm = normalizeText(searchTerm);

      const existingResults = allPokemonData.filter(pokemon => {
        if (!pokemon.japaneseName) return false;
        const normalizedName = normalizeText(pokemon.japaneseName);
        return normalizedName.includes(normalizedSearchTerm) || pokemon.japaneseName.includes(searchTerm);
      });

      const existingIds = new Set(allPokemonData.map(p => p.id));
      const missingIds = [];

      for (let id = startId; id <= endId; id++) {
        if (!existingIds.has(id)) {
          missingIds.push(id);
        }
      }

      let allNewData = [];

      if (missingIds.length > 0) {
        for (let i = 0; i < missingIds.length; i += 10) {
          const batch = missingIds.slice(i, i + 10);

          const batchResults = await Promise.all(
            batch.map(async (id) => {
              try {
                const pokemon = await getPokemonWithAllJapanese(`https://pokeapi.co/api/v2/pokemon/${id}/`);
                return pokemon;
              } catch (error) {
                return null;
              }
            })
          );

          const validResults = batchResults.filter(Boolean);
          allNewData = [...allNewData, ...validResults];
        }

        // 全データを一度に更新
        setAllPokemonData(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newUniqueData = allNewData.filter(p => !existingIds.has(p.id));
          return [...prev, ...newUniqueData];
        });
      }

      const newMatches = allNewData.filter(pokemon => {
        if (!pokemon.japaneseName) return false;
        const normalizedName = normalizeText(pokemon.japaneseName);
        return normalizedName.includes(normalizedSearchTerm) || pokemon.japaneseName.includes(searchTerm);
      });

      // IDで重複除去
      const allResults = [...existingResults, ...newMatches];
      const uniqueResults = allResults.reduce((acc, pokemon) => {
        if (!acc.find(p => p.id === pokemon.id)) {
          acc.push(pokemon);
        }
        return acc;
      }, []);

      // あいうえお順でソート
      uniqueResults.sort((a, b) => {
        if (a.japaneseName && b.japaneseName) {
          return a.japaneseName.localeCompare(b.japaneseName, 'ja');
        }
        return 0;
      });

      setSearchLoading(false);
      return uniqueResults;

    } catch (error) {
      setSearchLoading(false);
      return [];
    }
  };

  // メイン検索関数
  const handleSearchChange = async (term) => {
    setSearchTerm(term);

    if (term.trim() === "") {
      setIsSearching(false);
      setPokemonData(currentPageData);
      return;
    }

    setIsSearching(true);
    setSearchLoading(true);
    setPokemonData([]);

    // 1-151から検索開始
    let results = await searchInRange(term, 1, 151);

    if (results.length < 10) {
      const additionalResults = await searchInRange(term, 152, 251);

      // IDで重複防止
      const combinedResults = [...results, ...additionalResults];
      results = combinedResults.reduce((acc, pokemon) => {
        if (!acc.find(p => p.id === pokemon.id)) {
          acc.push(pokemon);
        }
        return acc;
      }, []);

      // 再ソート
      results.sort((a, b) => {
        if (a.japaneseName && b.japaneseName) {
          return a.japaneseName.localeCompare(b.japaneseName, 'ja');
        }
        return 0;
      });
    }

    setSearchLoading(false);
    setPokemonData(results);
  };

  const handleSearchClear = () => {
    setSearchTerm("");
    setIsSearching(false);
    setPokemonData(currentPageData);
    scrollToTop();
  };

  return (
    <>
      <Navbar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
      />
      <div className="App">
        {loading ? (
          <h1>ロード中・・・</h1>
        ) : (
          <>
            {isSearching && (
              <div className="search-info">
                {searchLoading ? (
                  <div className="search-loading">
                    <p>🔍 検索中...</p>
                    <p>しばらくお待ちください</p>
                  </div>
                ) : (
                  <p>"{searchTerm}" の検索結果: {pokemonData.length}件</p>
                )}
              </div>
            )}

            {/* 読み込み完了後に結果表示 */}
            {!searchLoading && (
              <div className="pokemonCardContainer">
                {pokemonData.length === 0 && isSearching ? (
                  <div className="no-results">
                    <p>検索結果が見つかりませんでした</p>
                    <p>ひらがな・カタカナで試してみてください</p>
                  </div>
                ) : (
                  pokemonData.map((pokemon, i) => {
                    // 重複防止
                    return <Card key={pokemon.id} pokemon={pokemon} />;
                  })
                )}
              </div>
            )}

            {!isSearching && (
              <div className="btn">
                <button onClick={handlePrevPage}>前へ</button>
                <button onClick={handleNextPage}>次へ</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default App;