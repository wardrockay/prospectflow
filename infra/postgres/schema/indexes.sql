CREATE INDEX idx_companies_siren ON companies(siren);
CREATE INDEX idx_companies_pharow_id ON companies(pharow_company_id);

CREATE INDEX idx_people_last_name ON people(last_name);

CREATE INDEX idx_positions_email ON positions(email);
CREATE INDEX idx_positions_company ON positions(company_id);
CREATE INDEX idx_positions_person ON positions(person_id);
