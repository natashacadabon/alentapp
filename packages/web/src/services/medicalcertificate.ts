import type {
  MedicalCertificateDTO,
  CreateMedicalCertificateRequest,
} from "@alentapp/shared";

const API_URL = "http://localhost:3000/api/v1/medicalcertificate";

export const medicalCertificateService = {
  
  async getAll(): Promise<MedicalCertificateDTO[]> {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Error al obtener certificados médicos");
    }

    return response.json();
  },

  async create(
    data: CreateMedicalCertificateRequest
  ): Promise<MedicalCertificateDTO> {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Error al crear certificado médico");
    }

    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Error al eliminar certificado médico");
    }
  },

  async update(
    id: string,
    data: Partial<CreateMedicalCertificateRequest>
  ): Promise<MedicalCertificateDTO> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Error al actualizar certificado médico");
    }

    return response.json();
  },
};