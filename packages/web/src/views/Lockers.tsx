import {
    Box,
    Button,
    Center,
    Flex,
    Heading,
    HStack,
    Input,
    IconButton,
    Spinner,
    Stack,
    Table,
    Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import type { CreateLockerRequest, LockerStatus } from '@alentapp/shared';
import { LuPencil, LuPlus, LuRefreshCw, LuTrash2 } from 'react-icons/lu';
import { useLockers } from '../hooks/useLockers';
import { useMemberSearch } from '../hooks/useMemberSearch';
import {
    DialogActionTrigger,
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogRoot,
    DialogTitle,
} from '../components/ui/dialog';
import { Field } from '../components/ui/field';
import { MemberSearchInput } from '../components/MemberSearchInput';
import { lockersService } from '../services/lockers';
import {
    SelectContent,
    SelectItem,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
    createListCollection,
} from '../components/ui/select';

const statusCollection = createListCollection({
    items: [
        { label: 'Disponible', value: 'Disponible' },
        { label: 'Ocupado', value: 'Ocupado' },
        { label: 'Mantenimiento', value: 'Mantenimiento' },
    ],
});

export function LockersView() {
    const { lockers, isLoading, error, fetchLockers } = useLockers();
    const lockerList = Array.isArray(lockers) ? lockers : [];
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<CreateLockerRequest>({
        number: 1,
        location: '',
        status: 'Disponible',
        member_id: null,
    });

    const {
        memberSearch,
        memberResults,
        memberSearchRef,
        searchMembers,
        handleSelectMember,
        resetMemberSearch,
    } = useMemberSearch((member) => {
        setFormData((prev) => ({
            ...prev,
            member_id: member.id,
            status: 'Ocupado',
        }));
    });

    const handleSearchMember = (value: string) => {
        searchMembers(value);

        if (value.trim().length === 0) {
            setFormData((prev) => ({
                ...prev,
                member_id: null,
            }));
        }
    };

    const handleCreateLocker = () => {
        setFormData({
            number: 1,
            location: '',
            status: 'Disponible',
            member_id: null,
        });
        resetMemberSearch();

        setIsDialogOpen(true);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);

        try {
            await lockersService.create({
                number: Number(formData.number),
                location: formData.location.trim(),
                status: formData.status ?? 'Disponible',
                member_id: formData.member_id ?? null,
            });
            setIsDialogOpen(false);
            fetchLockers();
        } catch (submitError: any) {
            alert(submitError.message || 'Error al crear el locker');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditLocker = (lockerId: string) => {
        // TODO: Implementar edición de locker cuando el backend esté listo
        console.log('Edit locker', lockerId);
    };

    const handleDeleteLocker = (lockerId: string) => {
        // TODO: Implementar baja de locker cuando el backend esté listo
        console.log('Delete locker', lockerId);
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Ocupado':
                return {
                    bg: 'red.50',
                    color: 'red.700',
                };
            case 'Mantenimiento':
                return {
                    bg: 'yellow.50',
                    color: 'yellow.700',
                };
            case 'Disponible':
            default:
                return {
                    bg: 'green.50',
                    color: 'green.700',
                };
        }
    };

    return (
        <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
            <Stack gap="8">
                <Flex justify="space-between" align="center">
                    <Stack gap="1">
                        <Heading size="2xl" fontWeight="bold">
                            Administración de Lockers
                        </Heading>

                        <Text color="fg.muted" fontSize="md">
                            Gestiona los lockers en Alentapp.
                        </Text>
                    </Stack>

                    <HStack gap="3">
                        <Button
                            variant="outline"
                            onClick={fetchLockers}
                            disabled={isLoading}
                        >
                            <LuRefreshCw /> Actualizar
                        </Button>

                        <Button
                            colorPalette="blue"
                            size="md"
                            onClick={handleCreateLocker}
                        >
                            <LuPlus /> Agregar Locker
                        </Button>
                    </HStack>
                </Flex>

                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Agregar Nuevo Locker</DialogTitle>
                        </DialogHeader>

                        <DialogBody>
                            <Stack gap="4">
                                <Field label="N° de Locker" required>
                                    <Input
                                        type="number"
                                        min={1}
                                        placeholder="Ej. 12"
                                        value={formData.number}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                number: Number(e.target.value),
                                            })
                                        }
                                        required
                                    />
                                </Field>

                                <Field label="Ubicación" required>
                                    <Input
                                        placeholder="Ej. Vestuario A"
                                        value={formData.location}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                location: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </Field>

                                <Field label="Estado" required>
                                    <SelectRoot
                                        collection={statusCollection}
                                        value={[formData.status ?? 'Disponible']}
                                        onValueChange={(e) => {
                                            const nextStatus =
                                                e.value[0] as LockerStatus;

                                            if (nextStatus === 'Mantenimiento') {
                                                resetMemberSearch();
                                            }

                                            setFormData({
                                                ...formData,
                                                status: nextStatus,
                                                member_id:
                                                    nextStatus ===
                                                    'Mantenimiento'
                                                        ? null
                                                        : formData.member_id ??
                                                          null,
                                            });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValueText placeholder="Seleccione un estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusCollection.items.map((status) => (
                                                <SelectItem item={status} key={status.value}>
                                                    {status.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectRoot>
                                </Field>

                                <Field label="Socio asignado">
                                    <MemberSearchInput
                                        value={memberSearch}
                                        results={memberResults}
                                        searchRef={memberSearchRef}
                                        onSearch={handleSearchMember}
                                        onSelect={handleSelectMember}
                                        required={false}
                                        disabled={formData.status === 'Mantenimiento'}
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
                                Crear Locker
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
                                <Text color="fg.muted">Cargando lockers...</Text>
                            </Stack>
                        </Center>
                    ) : lockerList.length === 0 ? (
                        <Center h="300px">
                            <Stack align="center" gap="4">
                                <Text color="fg.muted">
                                    No se encontraron lockers.
                                </Text>

                                <Button variant="ghost" onClick={fetchLockers}>
                                    Reintentar
                                </Button>
                            </Stack>
                        </Center>
                    ) : (
                        <Table.Root size="md" variant="line" interactive>
                            <Table.Header>
                                <Table.Row bg="bg.muted/50">
                                    <Table.ColumnHeader py="4">
                                        N° Locker
                                    </Table.ColumnHeader>

                                    <Table.ColumnHeader py="4">
                                        Ubicación
                                    </Table.ColumnHeader>

                                    <Table.ColumnHeader py="4">
                                        Estado
                                    </Table.ColumnHeader>

                                    <Table.ColumnHeader py="4">
                                        Socio asignado
                                    </Table.ColumnHeader>

                                    <Table.ColumnHeader py="4">
                                        Acciones
                                    </Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>

                            <Table.Body>
                                {lockerList.map((locker) => {
                                    const statusStyles = getStatusStyles(
                                        locker.status,
                                    );

                                    return (
                                        <Table.Row
                                            key={locker.id}
                                            _hover={{ bg: 'bg.muted/30' }}
                                        >
                                            <Table.Cell
                                                fontWeight="semibold"
                                                color="fg.emphasized"
                                            >
                                                {locker.number}
                                            </Table.Cell>

                                            <Table.Cell color="fg.muted">
                                                {locker.location}
                                            </Table.Cell>

                                            <Table.Cell>
                                                <Box
                                                    display="inline-block"
                                                    px="2"
                                                    py="0.5"
                                                    borderRadius="md"
                                                    bg={statusStyles.bg}
                                                    color={statusStyles.color}
                                                    fontSize="xs"
                                                    fontWeight="bold"
                                                >
                                                    {locker.status}
                                                </Box>
                                            </Table.Cell>

                                            <Table.Cell color="fg.muted">
                                                {locker.member?.name || 'Sin asignar'}
                                            </Table.Cell>

                                            <Table.Cell>
                                                <HStack
                                                    gap="2"
                                                    justify="flex-end"
                                                >
                                                    <IconButton
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        aria-label="Editar locker"
                                                        onClick={() =>
                                                            handleEditLocker(
                                                                locker.id,
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
                                                        aria-label="Eliminar locker"
                                                        onClick={() =>
                                                            handleDeleteLocker(
                                                                locker.id,
                                                            )
                                                        }
                                                    >
                                                        <LuTrash2 />
                                                    </IconButton>
                                                </HStack>
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                })}
                            </Table.Body>
                        </Table.Root>
                    )}
                </Box>
            </Stack>
        </DialogRoot>
    );
}
