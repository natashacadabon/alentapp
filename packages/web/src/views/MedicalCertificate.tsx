import React from 'react';
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
    IconButton,
} from '@chakra-ui/react';
import { LuPlus, LuRefreshCw, LuPencil, LuTrash2 } from 'react-icons/lu';
import { useEffect, useState } from 'react';
import { medicalCertificateService } from '../services/medicalCertificate';
import type {
    MedicalCertificateDTO,
    CreateMedicalCertificateRequest,
    UpdateMedicalCertificateRequest,
} from '@alentapp/shared';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogActionTrigger,
    DialogCloseTrigger,
} from '../components/ui/dialog';
import { Field } from '../components/ui/field';

export function MedicalCertificateView() {
    const [certificates, setCertificates] = useState<MedicalCertificateDTO[]>(
        [],
    );
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);
    const [editingCertificate, setEditingCertificate] =
        useState<MedicalCertificateDTO | null>(null);
    const [editFormData, setEditFormData] =
        useState<UpdateMedicalCertificateRequest | null>(null);

    const [formData, setFormData] = useState<CreateMedicalCertificateRequest>({
        issue_date: '',
        expiry_date: '',
        doctor_license: '',
        member_id: '',
    });

    const fetchCertificates = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await medicalCertificateService.getAll();
            setCertificates(data);
        } catch (err: any) {
            setError(err.message || 'Error al cargar los certificados médicos');
        } finally {
            setIsLoading(false);
        }
    };
    const openCreateModal = () => {
        setFormData({
            issue_date: '',
            expiry_date: '',
            doctor_license: '',
            member_id: '',
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await medicalCertificateService.create(formData);
            setIsDialogOpen(false);
            fetchCertificates();
        } catch (err: any) {
            alert(err.message || 'Error al guardar el certificado médico');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (certificate: MedicalCertificateDTO) => {
        setEditingCertificate(certificate);
        setEditFormData({
            issue_date: certificate.issue_date,
            expiry_date: certificate.expiry_date,
            doctor_license: certificate.doctor_license,
            member_id: certificate.member_id,
        });

        setIsEditDialogOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!editingCertificate || !editFormData) return;

        setIsEditSubmitting(true);

        try {
            await medicalCertificateService.update(
                editingCertificate.id,
                editFormData,
            );

            setIsEditDialogOpen(false);
            fetchCertificates();
        } catch (err: any) {
            alert(err.message || 'Error al actualizar el certificado médico');
        } finally {
            setIsEditSubmitting(false);
        }
    };
    useEffect(() => {
        fetchCertificates();
    }, []);

    return (
        <>
            <DialogRoot
                open={isDialogOpen}
                onOpenChange={(e) => setIsDialogOpen(e.open)}
            >
                <Stack gap="8">
                    <Flex justify="space-between" align="center">
                        <Stack gap="1">
                            <Heading size="2xl" fontWeight="bold">
                                Administración de Certificados Médicos
                            </Heading>
                            <Text color="fg.muted" fontSize="md">
                                Gestiona los certificados médicos registrados en
                                Alentapp.
                            </Text>
                        </Stack>

                        <HStack gap="3">
                            <Button
                                variant="outline"
                                onClick={fetchCertificates}
                                disabled={isLoading}
                            >
                                <LuRefreshCw /> Actualizar
                            </Button>

                            <Button
                                colorPalette="blue"
                                size="md"
                                onClick={openCreateModal}
                            >
                                <LuPlus /> Agregar Certificado
                            </Button>
                        </HStack>
                    </Flex>

                    <DialogContent>
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>
                                    Agregar Nuevo Certificado Médico
                                </DialogTitle>
                            </DialogHeader>

                            <DialogBody>
                                <Stack gap="4">
                                    <Field label="Fecha de emisión" required>
                                        <Input
                                            type="date"
                                            value={formData.issue_date}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    issue_date: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </Field>

                                    <Field
                                        label="Fecha de vencimiento"
                                        required
                                    >
                                        <Input
                                            type="date"
                                            value={formData.expiry_date}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    expiry_date: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </Field>

                                    <Field
                                        label="Matrícula del médico"
                                        required
                                    >
                                        <Input
                                            placeholder="Ej. MP 12345"
                                            value={formData.doctor_license}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    doctor_license:
                                                        e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </Field>

                                    <Field label="ID del socio" required>
                                        <Input
                                            placeholder="ID del miembro"
                                            value={formData.member_id}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    member_id: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </Field>
                                </Stack>
                            </DialogBody>

                            <DialogFooter>
                                <DialogActionTrigger asChild>
                                    <Button variant="outline">Cancelar</Button>
                                </DialogActionTrigger>

                                <Button
                                    type="submit"
                                    colorPalette="blue"
                                    loading={isSubmitting}
                                >
                                    Crear Certificado
                                </Button>
                            </DialogFooter>

                            <DialogCloseTrigger />
                        </form>
                    </DialogContent>

                    {error && (
                        <Box
                            p="4"
                            bg="red.50"
                            color="red.700"
                            borderRadius="md"
                            border="1px solid"
                            borderColor="red.200"
                        >
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
                                    <Text color="fg.muted">
                                        Cargando certificados médicos...
                                    </Text>
                                </Stack>
                            </Center>
                        ) : certificates.length === 0 ? (
                            <Center h="300px">
                                <Stack align="center" gap="4">
                                    <Text color="fg.muted">
                                        No se encontraron certificados médicos.
                                    </Text>
                                    <Button
                                        variant="ghost"
                                        onClick={fetchCertificates}
                                    >
                                        Reintentar
                                    </Button>
                                </Stack>
                            </Center>
                        ) : (
                            <Table.Root size="md" variant="line" interactive>
                                <Table.Header>
                                    <Table.Row bg="bg.muted/50">
                                        <Table.ColumnHeader py="4">
                                            Fecha emisión
                                        </Table.ColumnHeader>
                                        <Table.ColumnHeader py="4">
                                            Fecha vencimiento
                                        </Table.ColumnHeader>
                                        <Table.ColumnHeader py="4">
                                            Matrícula médica
                                        </Table.ColumnHeader>
                                        <Table.ColumnHeader py="4">
                                            Socio
                                        </Table.ColumnHeader>
                                        <Table.ColumnHeader py="4">
                                            Validado
                                        </Table.ColumnHeader>
                                        <Table.ColumnHeader py="4">
                                            Acciones
                                        </Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {certificates.length === 0 ? (
                                        <Table.Row>
                                            <Table.Cell
                                                colSpan={5}
                                                textAlign="center"
                                                color="fg.muted"
                                                py="6"
                                            >
                                                No hay certificados médicos
                                                cargados.
                                            </Table.Cell>
                                        </Table.Row>
                                    ) : (
                                        certificates.data.map((certificate) => (
                                            <Table.Row
                                                key={certificate.id}
                                                _hover={{ bg: 'bg.muted/30' }}
                                            >
                                                <Table.Cell color="fg.muted">
                                                    {new Date(
                                                        certificate.issue_date,
                                                    ).toLocaleDateString()}
                                                </Table.Cell>

                                                <Table.Cell color="fg.muted">
                                                    {new Date(
                                                        certificate.expiry_date,
                                                    ).toLocaleDateString()}
                                                </Table.Cell>

                                                <Table.Cell
                                                    fontWeight="semibold"
                                                    color="fg.emphasized"
                                                >
                                                    {certificate.doctor_license}
                                                </Table.Cell>

                                                <Table.Cell color="fg.muted">
                                                    {certificate.member_id}
                                                </Table.Cell>

                                                <Table.Cell>
                                                    <Box
                                                        display="inline-block"
                                                        px="2"
                                                        py="0.5"
                                                        borderRadius="md"
                                                        bg={
                                                            certificate.is_validated
                                                                ? 'green.50'
                                                                : 'gray.50'
                                                        }
                                                        color={
                                                            certificate.is_validated
                                                                ? 'green.700'
                                                                : 'gray.600'
                                                        }
                                                        fontSize="xs"
                                                        fontWeight="bold"
                                                    >
                                                        {certificate.is_validated
                                                            ? 'Sí'
                                                            : 'No'}
                                                    </Box>
                                                </Table.Cell>
                                                <Table.Cell w="140px">
                                                    <HStack
                                                        gap="2"
                                                        justify="center"
                                                    >
                                                        <IconButton
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            aria-label="Editar certificado médico"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    certificate,
                                                                )
                                                            }
                                                        >
                                                            <LuPencil />
                                                        </IconButton>

                                                        <IconButton
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            colorPalette="red"
                                                            aria-label="Eliminar certificado médico"
                                                            // onClick={

                                                            // }
                                                        >
                                                            <LuTrash2 />
                                                        </IconButton>
                                                    </HStack>
                                                </Table.Cell>
                                            </Table.Row>
                                        ))
                                    )}
                                </Table.Body>
                            </Table.Root>
                        )}
                    </Box>
                </Stack>
            </DialogRoot>
            <DialogRoot
                open={isEditDialogOpen}
                onOpenChange={(e) => setIsEditDialogOpen(e.open)}
            >
                {' '}
                <DialogContent>
                    <form onSubmit={handleUpdate}>
                        <DialogHeader>
                            <DialogTitle>Editar Certificado Médico</DialogTitle>
                        </DialogHeader>

                        <DialogBody>
                            <Stack gap="4">
                                <Field label="Fecha de emisión" required>
                                    <Input
                                        type="date"
                                        value={editFormData?.issue_date ?? ''}
                                        onChange={(e) =>
                                            setEditFormData((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          issue_date:
                                                              e.target.value,
                                                      }
                                                    : prev,
                                            )
                                        }
                                        required
                                    />
                                </Field>

                                <Field label="Fecha de vencimiento" required>
                                    <Input
                                        type="date"
                                        value={editFormData?.expiry_date ?? ''}
                                        onChange={(e) =>
                                            setEditFormData((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          expiry_date:
                                                              e.target.value,
                                                      }
                                                    : prev,
                                            )
                                        }
                                        required
                                    />
                                </Field>

                                <Field label="Matrícula del médico" required>
                                    <Input
                                        placeholder="Ej. MP 12345"
                                        value={
                                            editFormData?.doctor_license ?? ''
                                        }
                                        onChange={(e) =>
                                            setEditFormData((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          doctor_license:
                                                              e.target.value,
                                                      }
                                                    : prev,
                                            )
                                        }
                                        required
                                    />
                                </Field>

                                <Field label="ID del socio" required>
                                    <Input
                                        placeholder="ID del miembro"
                                        value={editFormData?.member_id ?? ''}
                                        onChange={(e) =>
                                            setEditFormData((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          member_id:
                                                              e.target.value,
                                                      }
                                                    : prev,
                                            )
                                        }
                                        required
                                    />
                                </Field>
                            </Stack>
                        </DialogBody>

                        <DialogFooter>
                            <DialogActionTrigger asChild>
                                <Button variant="outline">Cancelar</Button>
                            </DialogActionTrigger>

                            <Button
                                type="submit"
                                colorPalette="blue"
                                loading={isEditSubmitting}
                            >
                                Guardar Cambios
                            </Button>
                        </DialogFooter>

                        <DialogCloseTrigger />
                    </form>
                </DialogContent>
            </DialogRoot>
        </>
    );
}
