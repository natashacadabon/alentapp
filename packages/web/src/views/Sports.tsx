import { 
  Table, 
  Button, 
  Heading, 
  HStack, 
  Stack, 
  Text, 
  Box,
  Flex,
  Spinner,
  Center,
  Input,
  IconButton
} from "@chakra-ui/react";
import { LuPlus, LuRefreshCw, LuPencil, LuTrash2 } from "react-icons/lu";
import { useEffect, useState, useCallback } from "react";
import { sportsService } from "../services/sports";
import type { SportDTO, CreateSportRequest, UpdateSportRequest } from "@alentapp/shared";
import { 
  DialogRoot, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogBody, 
  DialogFooter, 
  DialogActionTrigger,
  DialogCloseTrigger
} from "../components/ui/dialog";
import { ConfirmActionDialog } from "../components/ConfirmActionDialog";
import { Field } from "../components/ui/field";

export function SportsView() {
  const [sports, setSports] = useState<SportDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create dialog
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateSportRequest>({
    name: "",
    description: "",
    max_capacity: 1,
    additional_price: 0,
    requires_medical_certificate: false,
  });

  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editingSportId, setEditingSportId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<SportDTO | null>(null);

  // Delete dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);
  const [deletingSport, setDeletingSport] = useState<SportDTO | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchSports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sportsService.getAll();
      setSports(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los deportes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openCreateModal = () => {
    setFormData({ name: "", description: "", max_capacity: 1, additional_price: 0, requires_medical_certificate: false });
    setIsCreateDialogOpen(true);
  };

  const openEditModal = (sport: SportDTO) => {
    setEditingSportId(sport.id);
    setEditFormData(sport);
    setIsEditDialogOpen(true);
  };

  const openDeleteModal = (sport: SportDTO) => {
    setDeletingSport(sport);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sportsService.create(formData);
      setIsCreateDialogOpen(false);
      fetchSports();
    } catch (err: any) {
      alert(err.message || "Error al guardar el deporte");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData) return;
    setIsEditSubmitting(true);
    try {
        await sportsService.update(editingSportId!, {
            description: editFormData.description,
            max_capacity: editFormData.max_capacity,
        });
        setIsEditDialogOpen(false);
        fetchSports();
    } catch (err: any) {
        alert(err.message || "Error al actualizar el deporte");
    } finally {
        setIsEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSport) return;
    setIsDeleteSubmitting(true);
    setDeleteError(null);
    try {
      await sportsService.delete(deletingSport.id);
      setIsDeleteDialogOpen(false);
      fetchSports();
    } catch (err: any) {
      setDeleteError(err.message || "Error al eliminar el deporte");
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  useEffect(() => {
    fetchSports();
  }, [fetchSports]);

  return (
    <>
      {/* Create Dialog */}
      <DialogRoot open={isCreateDialogOpen} onOpenChange={(e) => setIsCreateDialogOpen(e.open)}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Deporte</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Nombre" required>
                  <Input 
                    placeholder="Ej. Fútbol" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Descripción">
                  <Input 
                    placeholder="Descripción opcional" 
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Field>
                <Field label="Capacidad Máxima" required>
                  <Input 
                    type="number"
                    min={1}
                    placeholder="Ej. 20" 
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({ ...formData, max_capacity: Number(e.target.value) })}
                    required
                  />
                </Field>
                <Field label="Precio Adicional" required>
                  <Input 
                    type="number"
                    min={0}
                    placeholder="Ej. 500" 
                    value={formData.additional_price}
                    onChange={(e) => setFormData({ ...formData, additional_price: Number(e.target.value) })}
                    required
                  />
                </Field>
                <Field label="Requiere Certificado Médico">
                  <Flex align="center" justify="space-between" w="100%">
                    <Text fontSize="sm" color="fg.muted">¿El deporte requiere certificado médico?</Text>
                    <input 
                      type="checkbox"
                      checked={formData.requires_medical_certificate}
                      onChange={(e) => setFormData({ ...formData, requires_medical_certificate: e.target.checked })}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                  </Flex>
                </Field>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                Crear Deporte
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>
      </DialogRoot>

      {/* Edit Dialog */}
      <DialogRoot open={isEditDialogOpen} onOpenChange={(e) => setIsEditDialogOpen(e.open)}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Editar Deporte</DialogTitle>
            </DialogHeader>
            <DialogBody>
               <Stack gap="4">
                <Field label="Nombre">
                  <Text fontSize="sm" color="fg.muted" py="2" borderBottomWidth="1px" borderColor="border.muted" w="100%">
                    {editFormData?.name}
                  </Text>
                </Field>
                <Field label="Descripción">
                  <Input 
                    placeholder="Descripción opcional" 
                    value={editFormData?.description || ""}
                    onChange={(e) => setEditFormData(editFormData ? { ...editFormData, description: e.target.value } : null)}
                  />
                </Field>
                <Field label="Capacidad Máxima" required>
                  <Input 
                    type="number"
                    min={1}
                    value={editFormData?.max_capacity || 1}
                    onChange={(e) => setEditFormData(editFormData ? { ...editFormData, max_capacity: Number(e.target.value) } : null)}
                    required
                  />
                </Field>
                <Field label="Precio Adicional">
                  <Text fontSize="sm" color="fg.muted" py="2" borderBottomWidth="1px" borderColor="border.muted" w="100%">
                    ${editFormData?.additional_price}
                  </Text>
                </Field>
                <Field label="Requiere Certificado Médico">
                  <Text fontSize="sm" color="fg.muted" py="2" borderBottomWidth="1px" borderColor="border.muted" w="100%">
                    {editFormData?.requires_medical_certificate ? 'Sí' : 'No'}
                  </Text>
                </Field>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isEditSubmitting}>
                Guardar Cambios
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>
      </DialogRoot>

      {/* Delete Dialog */}
      <DialogRoot open={isDeleteDialogOpen} onOpenChange={(e) => setIsDeleteDialogOpen(e.open)}>
        <ConfirmActionDialog
          title="Eliminar Deporte"
          description={`¿Estás segura de que deseas eliminar el deporte "${deletingSport?.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          isLoading={isDeleteSubmitting}
          error={deleteError}
          variant="danger"
          onConfirm={handleDelete}
        />
      </DialogRoot>

      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Deportes</Heading>
            <Text color="fg.muted" fontSize="md">
              Gestiona el catálogo de deportes del club: registrá nuevas disciplinas, definí su capacidad máxima y configurá si requieren certificado médico.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchSports} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Deporte
            </Button>
          </HStack>
        </Flex>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

        <Box 
          bg="bg.panel" 
          borderRadius="xl" 
          boxShadow="sm" 
          borderWidth="1px" 
          overflow="hidden"
          minH="300px"
          position="relative"
        >
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando deportes...</Text>
              </Stack>
            </Center>
          ) : sports.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron deportes.</Text>
                <Button variant="ghost" onClick={fetchSports}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Nombre</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Descripción</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Cap. Máxima</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Precio Adicional</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Cert. Médico</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sports.map((sport) => (
                  <Table.Row key={sport.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">{sport.name}</Table.Cell>
                    <Table.Cell color="fg.muted">{sport.description || '-'}</Table.Cell>
                    <Table.Cell color="fg.muted">{sport.max_capacity}</Table.Cell>
                    <Table.Cell color="fg.muted">${sport.additional_price}</Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={sport.requires_medical_certificate ? 'green.50' : 'gray.50'}
                        color={sport.requires_medical_certificate ? 'green.700' : 'gray.600'}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {sport.requires_medical_certificate ? 'Sí' : 'No'}
                      </Box>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <HStack gap="2" justify="flex-end">
                        <IconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Editar deporte"
                          onClick={() => openEditModal(sport)}
                        >
                          <LuPencil />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          aria-label="Eliminar deporte"
                          onClick={() => openDeleteModal(sport)}
                        >
                          <LuTrash2 />
                        </IconButton>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </>
  );
}