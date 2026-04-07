/**
 * pdf.js — Print / PDF export helpers
 * FK Nový Jičín U8 Coach App
 *
 * Print is handled via window.print() + print-specific CSS.
 * This file provides helpers for preparing the print view.
 */

const PDFExport = (() => {

  function printTraining(trainingId) {
    // Navigate to training detail if not already there, then print
    const currentHash = window.location.hash;
    const targetHash = `#/training/${trainingId}`;

    if (currentHash !== targetHash) {
      // Save where we are, navigate, then print after render
      window.location.hash = targetHash;
      // Small delay to allow render
      setTimeout(() => window.print(), 400);
    } else {
      window.print();
    }
  }

  // Set print-ready title for PDF filename
  function setPrintTitle(title) {
    const original = document.title;
    document.title = title;
    window.addEventListener('afterprint', function restoreTitle() {
      document.title = original;
      window.removeEventListener('afterprint', restoreTitle);
    });
  }

  return {
    printTraining,
    setPrintTitle
  };
})();
