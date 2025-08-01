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
    return text.replace(/[\u30a1-\u30f6]/g, (match) => {
      return String.fromCharCode(match.charCodeAt(0) - 0x60);
    });
  };

  // 厳密な検索条件チェック関数
  const isExactMatch = (pokemonName, searchTerm) => {
    if (!pokemonName || !searchTerm) return false;

    const normalizedPokemonName = normalizeText(pokemonName);
    const normalizedSearchTerm = normalizeText(searchTerm);

    // 完全に一致する検索条件のみを許可
    // 元の検索語と正規化された検索語の両方でチェック
    return normalizedPokemonName.includes(normalizedSearchTerm) || pokemonName.includes(searchTerm);
  };

  // 指定範囲内でのポケモン検索（厳密版）
  const searchInRange = async (searchTerm, startId = 1, endId = 151) => {
    // 空の検索語は即座に空配列を返す
    if (!searchTerm || searchTerm.trim() === "") {
      return [];
    }

    try {
      // ステップ1: 既存データから該当するポケモンを検索
      const existingMatches = allPokemonData
        .filter(pokemon => pokemon.id >= startId && pokemon.id <= endId)
        .filter(pokemon => isExactMatch(pokemon.japaneseName, searchTerm));

      // ステップ2: 不足しているIDを特定
      const existingIds = new Set(allPokemonData.map(p => p.id));
      const missingIds = [];

      for (let id = startId; id <= endId; id++) {
        if (!existingIds.has(id)) {
          missingIds.push(id);
        }
      }

      // ステップ3: 不足データを取得（必要な場合のみ）
      let newMatches = [];
      if (missingIds.length > 0) {
        const newPokemonData = [];

        // バッチ処理で不足データを取得
        for (let i = 0; i < missingIds.length; i += 10) {
          const batch = missingIds.slice(i, i + 10);

          const batchResults = await Promise.all(
            batch.map(async (id) => {
              try {
                const pokemon = await getPokemonWithAllJapanese(`https://pokeapi.co/api/v2/pokemon/${id}/`);
                return pokemon;
              } catch (error) {
                return null; // エラーの場合はnullを返す
              }
            })
          );

          // 有効な結果のみを追加
          const validResults = batchResults.filter(Boolean);
          newPokemonData.push(...validResults);
        }

        // 全体のデータストアを更新
        if (newPokemonData.length > 0) {
          setAllPokemonData(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNewData = newPokemonData.filter(p => !existingIds.has(p.id));
            return [...prev, ...uniqueNewData];
          });

          // 新しく取得したデータから検索条件に一致するものを抽出
          newMatches = newPokemonData.filter(pokemon =>
            isExactMatch(pokemon.japaneseName, searchTerm)
          );
        }
      }

      // ステップ4: 既存の一致結果と新規の一致結果を統合
      const allMatches = [...existingMatches, ...newMatches];

      // ステップ5: IDによる重複除去
      const uniqueMatches = allMatches.reduce((acc, pokemon) => {
        if (!acc.find(p => p.id === pokemon.id)) {
          acc.push(pokemon);
        }
        return acc;
      }, []);

      // ステップ6: あいうえお順でソート
      uniqueMatches.sort((a, b) => {
        if (a.japaneseName && b.japaneseName) {
          return a.japaneseName.localeCompare(b.japaneseName, 'ja');
        }
        return 0;
      });

      return uniqueMatches;

    } catch (error) {
      // エラーが発生した場合は空配列を返す
      return [];
    }
  };

  // メイン検索関数：厳密な制御版
  const handleSearchChange = async (term) => {
    setSearchTerm(term);

    // 検索語が空の場合は通常表示に戻す
    if (term.trim() === "") {
      setIsSearching(false);
      setPokemonData(currentPageData);
      return;
    }

    // 初期読み込み中は検索を実行しない
    if (loading) {
      setIsSearching(true);
      setSearchLoading(true);
      setPokemonData([]);
      return;
    }

    // 検索開始
    setIsSearching(true);
    setSearchLoading(true);
    setPokemonData([]); // 検索中は結果をクリア

    try {
      // 第1世代（1-151）で検索
      const firstGenResults = await searchInRange(term, 1, 151);

      let finalResults = firstGenResults;

      // 第1世代の結果が10件未満の場合のみ第2世代も検索
      if (firstGenResults.length < 10) {
        const secondGenResults = await searchInRange(term, 152, 251);

        // 両世代の結果を統合（重複除去）
        const combinedResults = [...firstGenResults, ...secondGenResults];
        finalResults = combinedResults.reduce((acc, pokemon) => {
          if (!acc.find(p => p.id === pokemon.id)) {
            acc.push(pokemon);
          }
          return acc;
        }, []);

        // 最終的な結果を再ソート
        finalResults.sort((a, b) => {
          if (a.japaneseName && b.japaneseName) {
            return a.japaneseName.localeCompare(b.japaneseName, 'ja');
          }
          return 0;
        });
      }

      // 検索完了
      setSearchLoading(false);
      setPokemonData(finalResults);

    } catch (error) {
      // エラーが発生した場合は空の結果を表示
      setSearchLoading(false);
      setPokemonData([]);
    }
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
        disabled={loading}
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
                    {loading ? (
                      <>
                        <p>⏳ 初期読み込み完了後に検索を開始します</p>
                        <p>しばらくお待ちください</p>
                      </>
                    ) : (
                      <>
                        <p>🔍 検索中...</p>
                        <p>しばらくお待ちください</p>
                      </>
                    )}
                  </div>
                ) : (
                  <p>"{searchTerm}" の検索結果: {pokemonData.length}件</p>
                )}
              </div>
            )}

            {!searchLoading && (
              <div className="pokemonCardContainer">
                {pokemonData.length === 0 && isSearching ? (
                  <div className="no-results">
                    <p>検索結果が見つかりませんでした</p>
                    <p>ひらがな・カタカナで試してみてください</p>
                  </div>
                ) : (
                  pokemonData.map((pokemon) => {
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