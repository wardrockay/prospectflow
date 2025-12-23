git reset --hard origin/main--
-- PostgreSQL database dump
--

\restrict ABvYcvNv69OknsmWkCQDHpvMvgikrVnnP8mDr0qdyUz8fkFYMY1NDW1Xmwa9jOQ

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: crm; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA crm;


--
-- Name: iam; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA iam;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: companies; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organisation_id uuid NOT NULL,
    pharow_company_id character varying(32),
    siren character varying(9),
    hq_siret character varying(14),
    name character varying(255) NOT NULL,
    brand_name character varying(255),
    linkedin_name character varying(255),
    naf_sector character varying(255),
    activity text,
    founding_year smallint,
    founding_date date,
    growing boolean,
    employee_range character varying(50),
    annual_revenue_eur bigint,
    annual_revenue_year smallint,
    main_phone character varying(32),
    generic_email public.citext,
    website_url text,
    linkedin_url text,
    hq_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: people; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.people (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organisation_id uuid NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    salutation character varying(50),
    linkedin_url text,
    mobile_phone character varying(32),
    phone_kaspr_1 character varying(32),
    phone_kaspr_3 character varying(32),
    phone_bettercontact character varying(32),
    phone_fullenrich_1 character varying(32),
    phone_fullenrich_3 character varying(32),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: positions; Type: TABLE; Schema: crm; Owner: -
--

CREATE TABLE crm.positions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organisation_id uuid NOT NULL,
    person_id uuid NOT NULL,
    company_id uuid NOT NULL,
    job_title character varying(255),
    pharow_list_name character varying(255),
    email public.citext,
    email_status character varying(50),
    email_reliability numeric(5,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organisation_users; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.organisation_users (
    organisation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organisation_users_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'viewer'::text]))),
    CONSTRAINT organisation_users_status_check CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'disabled'::text])))
);


--
-- Name: organisations; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.organisations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: iam; Owner: -
--

CREATE TABLE iam.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email public.citext NOT NULL,
    first_name text,
    last_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flyway_schema_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


--
-- Name: companies companies_organisation_id_pharow_company_id_key; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.companies
    ADD CONSTRAINT companies_organisation_id_pharow_company_id_key UNIQUE (organisation_id, pharow_company_id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: people people_organisation_id_first_name_last_name_linkedin_url_key; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.people
    ADD CONSTRAINT people_organisation_id_first_name_last_name_linkedin_url_key UNIQUE (organisation_id, first_name, last_name, linkedin_url);


--
-- Name: people people_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.people
    ADD CONSTRAINT people_pkey PRIMARY KEY (id);


--
-- Name: positions positions_organisation_id_company_id_person_id_email_key; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.positions
    ADD CONSTRAINT positions_organisation_id_company_id_person_id_email_key UNIQUE (organisation_id, company_id, person_id, email);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: companies ux_companies_org_id; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.companies
    ADD CONSTRAINT ux_companies_org_id UNIQUE (organisation_id, id);


--
-- Name: people ux_people_org_id; Type: CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.people
    ADD CONSTRAINT ux_people_org_id UNIQUE (organisation_id, id);


--
-- Name: organisation_users organisation_users_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.organisation_users
    ADD CONSTRAINT organisation_users_pkey PRIMARY KEY (organisation_id, user_id);


--
-- Name: organisations organisations_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.organisations
    ADD CONSTRAINT organisations_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: idx_companies_org_pharow; Type: INDEX; Schema: crm; Owner: -
--

CREATE INDEX idx_companies_org_pharow ON crm.companies USING btree (organisation_id, pharow_company_id);


--
-- Name: idx_companies_org_siren; Type: INDEX; Schema: crm; Owner: -
--

CREATE INDEX idx_companies_org_siren ON crm.companies USING btree (organisation_id, siren);


--
-- Name: idx_people_org_last_name; Type: INDEX; Schema: crm; Owner: -
--

CREATE INDEX idx_people_org_last_name ON crm.people USING btree (organisation_id, last_name);


--
-- Name: idx_positions_org_company; Type: INDEX; Schema: crm; Owner: -
--

CREATE INDEX idx_positions_org_company ON crm.positions USING btree (organisation_id, company_id);


--
-- Name: idx_positions_org_email; Type: INDEX; Schema: crm; Owner: -
--

CREATE INDEX idx_positions_org_email ON crm.positions USING btree (organisation_id, email);


--
-- Name: idx_positions_org_person; Type: INDEX; Schema: crm; Owner: -
--

CREATE INDEX idx_positions_org_person ON crm.positions USING btree (organisation_id, person_id);


--
-- Name: idx_org_users_user; Type: INDEX; Schema: iam; Owner: -
--

CREATE INDEX idx_org_users_user ON iam.organisation_users USING btree (user_id);


--
-- Name: ux_one_owner_per_org; Type: INDEX; Schema: iam; Owner: -
--

CREATE UNIQUE INDEX ux_one_owner_per_org ON iam.organisation_users USING btree (organisation_id) WHERE (role = 'owner'::text);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success);


--
-- Name: companies trg_companies_updated_at; Type: TRIGGER; Schema: crm; Owner: -
--

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON crm.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: people trg_people_updated_at; Type: TRIGGER; Schema: crm; Owner: -
--

CREATE TRIGGER trg_people_updated_at BEFORE UPDATE ON crm.people FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: positions trg_positions_updated_at; Type: TRIGGER; Schema: crm; Owner: -
--

CREATE TRIGGER trg_positions_updated_at BEFORE UPDATE ON crm.positions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: organisation_users trg_org_users_updated_at; Type: TRIGGER; Schema: iam; Owner: -
--

CREATE TRIGGER trg_org_users_updated_at BEFORE UPDATE ON iam.organisation_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: organisations trg_organisations_updated_at; Type: TRIGGER; Schema: iam; Owner: -
--

CREATE TRIGGER trg_organisations_updated_at BEFORE UPDATE ON iam.organisations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: iam; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON iam.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: companies companies_organisation_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.companies
    ADD CONSTRAINT companies_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES iam.organisations(id) ON DELETE CASCADE;


--
-- Name: positions fk_positions_company_same_org; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.positions
    ADD CONSTRAINT fk_positions_company_same_org FOREIGN KEY (organisation_id, company_id) REFERENCES crm.companies(organisation_id, id) ON DELETE CASCADE;


--
-- Name: positions fk_positions_person_same_org; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.positions
    ADD CONSTRAINT fk_positions_person_same_org FOREIGN KEY (organisation_id, person_id) REFERENCES crm.people(organisation_id, id) ON DELETE CASCADE;


--
-- Name: people people_organisation_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.people
    ADD CONSTRAINT people_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES iam.organisations(id) ON DELETE CASCADE;


--
-- Name: positions positions_organisation_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: -
--

ALTER TABLE ONLY crm.positions
    ADD CONSTRAINT positions_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES iam.organisations(id) ON DELETE CASCADE;


--
-- Name: organisation_users organisation_users_organisation_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.organisation_users
    ADD CONSTRAINT organisation_users_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES iam.organisations(id) ON DELETE CASCADE;


--
-- Name: organisation_users organisation_users_user_id_fkey; Type: FK CONSTRAINT; Schema: iam; Owner: -
--

ALTER TABLE ONLY iam.organisation_users
    ADD CONSTRAINT organisation_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ABvYcvNv69OknsmWkCQDHpvMvgikrVnnP8mDr0qdyUz8fkFYMY1NDW1Xmwa9jOQ

