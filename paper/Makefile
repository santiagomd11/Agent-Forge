.PHONY: paper figures clean

MAIN = main
PYTHON = python3

paper: figures
	pdflatex $(MAIN).tex
	bibtex $(MAIN)
	pdflatex $(MAIN).tex
	pdflatex $(MAIN).tex

figures:
	cd figures && $(PYTHON) fig2_power_law.py
	cd figures && $(PYTHON) fig3_trajectory.py
	cd figures && $(PYTHON) fig4_duration.py

quick:
	pdflatex $(MAIN).tex

clean:
	rm -f $(MAIN).aux $(MAIN).bbl $(MAIN).blg $(MAIN).log $(MAIN).out
	rm -f $(MAIN).pdf $(MAIN).toc $(MAIN).lof $(MAIN).lot
	rm -f figures/*.pdf
