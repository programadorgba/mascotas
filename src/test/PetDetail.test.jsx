import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PetDetail from "../features/owners/pages/PetDetail";

vi.mock("../shared/lib/supabaseClient.js", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("../shared/lib/petPhotos.js", () => ({
  createPetPhotoSignedUrl: vi.fn(() =>
    Promise.resolve("https://foto.test/rex.jpg"),
  ),
}));

vi.mock("../shared/lib/diagnosticImaging.js", () => ({
  addDiagnosticImageSignedUrls: vi.fn((records) => Promise.resolve(records || [])),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { supabase } from "../shared/lib/supabaseClient.js";

const petMock = {
  id: "pet-123",
  name: "Rex",
  animal_type: "Perro",
  sex: "Macho",
  breed: "Labrador",
  chip_number: "123456789",
  birth_date: "2020-01-01",
  insurance_company: "Mapfre",
  policy_number: "POL-001",
  photo_url: "user-123/pet-123.jpg",
};

const recordsMock = [
  {
    id: "rec-1",
    record_type: "consulta",
    notes: "Revision anual",
    weight_kg: 25,
    height_cm: 60,
    document_url: null,
    recorded_at: "2024-03-01T10:00:00Z",
  },
  {
    id: "rec-2",
    record_type: "vacuna",
    notes: "Rabia",
    weight_kg: null,
    height_cm: null,
    document_url: null,
    recorded_at: "2024-01-15T10:00:00Z",
  },
];

function mockSupabase(pet = petMock, records = recordsMock) {
  supabase.from.mockImplementation((table) => {
    if (table === 'pets') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: pet }),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      }
    }
    if (table === 'imaging_records') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [] }),
          })),
        })),
      }
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: records }),
        })),
      })),
    }
  })
}

function renderPetDetail() {
  return render(
    <MemoryRouter initialEntries={["/mascotas/pet-123"]}>
      <Routes>
        <Route path="/mascotas/:petId" element={<PetDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PetDetail — ficha de mascota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra los datos de la mascota", async () => {
    mockSupabase();
    renderPetDetail();

    await waitFor(() => {
      expect(screen.getByText("Rex")).toBeInTheDocument();
      expect(screen.getByText("Perro")).toBeInTheDocument();
      expect(screen.getAllByText("Macho").length).toBeGreaterThan(0);
      expect(screen.getByText(/labrador/i)).toBeInTheDocument();
    });
  });

it('muestra el ultimo peso y altura', async () => {
  mockSupabase()
  renderPetDetail()

  await waitFor(() => screen.getByText('Rex'))

  const summaryGrid = document.querySelector('.pet-summary-grid')
  expect(summaryGrid.textContent).toMatch(/25 kg/)
  expect(summaryGrid.textContent).toMatch(/60 cm/)
})

  it("muestra mensaje si no hay registros en una pestaña", async () => {
    mockSupabase();
    renderPetDetail();

    await waitFor(() => screen.getByText("Rex"));

    fireEvent.click(screen.getByRole("button", { name: /analisis/i }));
    expect(
      screen.getByText(/no hay registros en esta categoria/i),
    ).toBeInTheDocument();
  });

  it("filtra registros al cambiar de pestaña", async () => {
    mockSupabase();
    renderPetDetail();

    await waitFor(() => screen.getByText("Rex"));

    fireEvent.click(screen.getByRole("button", { name: /consultas/i }));
    expect(screen.getByText("Revision anual")).toBeInTheDocument();
    expect(screen.queryByText("Rabia")).not.toBeInTheDocument();
  });

  it("muestra mensaje si la mascota no existe", async () => {
    supabase.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null }),
          order: vi.fn().mockResolvedValue({ data: [] }),
        })),
      })),
    }));

    renderPetDetail();

    await waitFor(() => {
      expect(screen.getByText(/mascota no encontrada/i)).toBeInTheDocument();
    });
  });
});
