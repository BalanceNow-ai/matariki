"""Regenerate the CV fixtures used by src/__tests__/crew/cv-extraction.test.ts.

    python3 scripts/make-crew-cv-fixtures.py

Needs python-docx; the PDF copy also needs LibreOffice (soffice) on PATH.
"""
import os
import shutil
import subprocess
import docx

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "__tests__", "crew", "cv-fixtures")
DOCX = os.path.join(OUT, "sailing-cv.docx")

d = docx.Document()
d.core_properties.author = "Test Fixture"
d.add_heading("Sailing CV - Test Applicant", level=1)
d.add_paragraph("Offshore crew based in Auckland with 6,000 nautical miles, 2,500 of them offshore.")
d.add_paragraph("Comfortable standing night watches, reefing at the change of watch, and cooking underway.")
d.add_heading("Passages", level=2)
t = d.add_table(rows=1, cols=4)
t.style = "Table Grid"
for cell, text in zip(t.rows[0].cells, ["Year", "Route", "Boat", "Role"]):
    cell.text = text
for row in [
    ("2024", "Opua to Tonga", "Hallberg-Rassy 46", "Watch leader"),
    ("2023", "Auckland to Noumea", "Beneteau Oceanis 51", "Crew"),
    ("2022", "Hauraki Gulf coastal", "Young 88", "Helm"),
]:
    cells = t.add_row().cells
    for cell, text in zip(cells, row):
        cell.text = text
d.add_heading("Qualifications", level=2)
d.add_paragraph("Yachtmaster Offshore; Sea Survival; First Aid; marine radio licence.")
d.save(DOCX)

if shutil.which("soffice"):
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", OUT, DOCX], check=True, capture_output=True)
print("wrote", os.listdir(OUT))
