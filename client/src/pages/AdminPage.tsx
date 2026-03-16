import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchCategories,
  fetchBoards,
  importCsv,
  createBoard,
  deleteCategory,
  deleteBoard,
  type CategoryInfo,
  type GameBoard,
} from '../services/api';
import './AdminPage.css';

export function AdminPage() {
  const navigate = useNavigate();

  // Categories
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());

  // Boards
  const [boards, setBoards] = useState<GameBoard[]>([]);
  const [boardName, setBoardName] = useState('');

  // CSV import
  const [importResult, setImportResult] = useState<{
    imported: number;
    categories_created: string[];
    errors: string[];
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'paste'>('paste');
  const [importing, setImporting] = useState(false);

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [cats, bds] = await Promise.all([fetchCategories(), fetchBoards()]);
      setCategories(cats);
      setBoards(bds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // CSV Import
  const handleCsvImport = async (text: string) => {
    setError('');
    setImportResult(null);
    setImporting(true);

    try {
      const result = await importCsv(text);
      setImportResult(result);
      setCsvText('');
      const cats = await fetchCategories();
      setCategories(cats);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file.');
      return;
    }
    const text = await file.text();
    handleCsvImport(text);
  };

  const handlePasteImport = () => {
    if (!csvText.trim()) {
      setError('Klistra in CSV-data först.');
      return;
    }
    handleCsvImport(csvText);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  // Category selection
  const toggleCategory = (id: string) => {
    setSelectedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}" and all its questions?`)) return;
    setError('');
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setSelectedCatIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Board creation
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!boardName.trim()) {
      setError('Please enter a board name.');
      return;
    }
    if (selectedCatIds.size === 0) {
      setError('Please select at least one category.');
      return;
    }

    try {
      await createBoard(boardName.trim(), Array.from(selectedCatIds));
      setBoardName('');
      setSelectedCatIds(new Set());
      const bds = await fetchBoards();
      setBoards(bds);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteBoard = async (id: string, name: string) => {
    if (!confirm(`Delete board "${name}"?`)) return;
    setError('');
    try {
      await deleteBoard(id);
      setBoards((prev) => prev.filter((b) => b.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="admin">
        <p className="admin__loading">Loading...</p>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="admin__header">
        <button className="admin__back" onClick={() => navigate('/')} aria-label="Go back">
          &larr; Back
        </button>
        <h1 className="admin__title">ADMIN</h1>
      </div>

      {error && <p className="admin__error">{error}</p>}

      {/* CSV Import */}
      <section className="admin__section">
        <h2 className="admin__section-title">Import Questions (CSV)</h2>

        <div className="admin__import-tabs">
          <button
            className={`admin__import-tab${importMode === 'paste' ? ' admin__import-tab--active' : ''}`}
            onClick={() => setImportMode('paste')}
          >
            Klistra in CSV
          </button>
          <button
            className={`admin__import-tab${importMode === 'file' ? ' admin__import-tab--active' : ''}`}
            onClick={() => setImportMode('file')}
          >
            Ladda upp fil
          </button>
        </div>

        {importMode === 'paste' ? (
          <div className="admin__paste-area">
            <textarea
              className="admin__csv-textarea"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"category,question_text,correct_answer,wrong_answer1,wrong_answer2,wrong_answer3,points\nSvensk Historia,Vilken kung...,Gustav Vasa,Karl XII,Gustav II Adolf,Erik XIV,200"}
              rows={8}
            />
            <button
              className="btn admin__paste-btn"
              onClick={handlePasteImport}
              disabled={importing || !csvText.trim()}
            >
              {importing ? 'Importerar...' : 'Importera'}
            </button>
          </div>
        ) : (
          <div
            className={`admin__dropzone${dragActive ? ' admin__dropzone--active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <p className="admin__dropzone-text">
              Drop a CSV file here or click to browse
            </p>
            <p className="admin__dropzone-hint">
              Header: category, question_text, correct_answer, wrong_answer1, wrong_answer2, wrong_answer3, points
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="admin__file-input"
              onChange={handleFileInput}
            />
          </div>
        )}

        {importResult && (
          <div className="admin__import-result">
            <p className="admin__import-success">
              Imported {importResult.imported} question{importResult.imported !== 1 ? 's' : ''}
            </p>
            {importResult.categories_created.length > 0 && (
              <p className="admin__import-cats">
                New categories: {importResult.categories_created.join(', ')}
              </p>
            )}
            {importResult.errors.length > 0 && (
              <ul className="admin__import-errors">
                {importResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Categories */}
      <section className="admin__section">
        <h2 className="admin__section-title">
          Categories ({categories.length})
        </h2>
        {categories.length === 0 ? (
          <p className="admin__empty">No categories yet. Import a CSV to get started.</p>
        ) : (
          <div className="admin__categories">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`admin__cat-card${selectedCatIds.has(cat.id) ? ' admin__cat-card--selected' : ''}`}
                onClick={() => toggleCategory(cat.id)}
              >
                <input
                  type="checkbox"
                  className="admin__cat-checkbox"
                  checked={selectedCatIds.has(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="admin__cat-info">
                  <div className="admin__cat-name">{cat.name}</div>
                  <div className="admin__cat-count">{cat.question_count} questions</div>
                </div>
                <button
                  className="admin__cat-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(cat.id, cat.name);
                  }}
                  title="Delete category"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Board Builder */}
      <section className="admin__section">
        <h2 className="admin__section-title">Board Builder</h2>
        <form className="admin__board-form" onSubmit={handleCreateBoard}>
          <input
            className="admin__board-input"
            type="text"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            placeholder="Board name"
          />
          <button className="btn" type="submit" disabled={selectedCatIds.size === 0}>
            Create Board ({selectedCatIds.size} categories)
          </button>
        </form>

        <h3 className="admin__section-title" style={{ fontSize: '1rem', marginTop: 24 }}>
          Existing Boards ({boards.length})
        </h3>
        {boards.length === 0 ? (
          <p className="admin__empty">No boards yet.</p>
        ) : (
          <div className="admin__boards-list">
            {boards.map((board) => (
              <div key={board.id} className="admin__board-item">
                <span className="admin__board-name">{board.name}</span>
                <button
                  className="admin__board-delete"
                  onClick={() => handleDeleteBoard(board.id, board.name)}
                  title="Delete board"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
