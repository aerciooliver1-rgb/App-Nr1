CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  economic_sector TEXT,
  size TEXT,
  contact_name TEXT,
  contact_email TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  employee_count INTEGER NOT NULL DEFAULT 0 CHECK (employee_count >= 0),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies: admin gerencia as próprias"
  ON companies FOR ALL
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "companies: visualizador lê"
  ON companies FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Sectors
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sectors: admin gerencia"
  ON sectors FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "sectors: visualizador lê"
  ON sectors FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Índices
CREATE INDEX idx_sectors_company_id ON sectors(company_id);
