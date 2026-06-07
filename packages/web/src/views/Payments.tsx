import {
    Box,
    Button,
    Center,
    Flex,
    Heading,
    HStack,
    IconButton,
    Spinner,
    Stack,
    Table,
    Text,
} from '@chakra-ui/react';
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from 'react-icons/lu';
import { DialogRoot } from '../components/ui/dialog';
import type { PaymentDTO } from '@alentapp/shared';
import { usePayments } from '../hooks/usePayments';
import { usePaymentForm } from '../hooks/usePaymentForm';
import { useMemberSearch } from '../hooks/useMemberSearch';
import { ConfirmActionDialog } from '../components/ConfirmActionDialog';
import { PaymentFormDialog } from '../components/PaymentFormDialog';

import { formatDate } from '../utils/paymentDates';
import { formatCurrency } from '../utils/currency';

export function PaymentsView() {
    const {
        payments,
        isLoading,
        error,
        paymentToCancel,
        isCancellingPayment,
        cancelError,
        fetchPayments,
        openCancelPaymentDialog,
        closeCancelPaymentDialog,
        cancelPayment,
    } = usePayments();
    const paymentList = Array.isArray(payments) ? payments : [];
    const {
        formMode,
        formData,
        isDialogOpen,
        isSubmitting,
        setIsDialogOpen,
        openCreateModal,
        openUpdateModal,
        updateField,
        updateMonth,
        updateYear,
        submitPayment,
    } = usePaymentForm(fetchPayments);

    const {
        memberSearch,
        memberResults,
        memberSearchRef,
        searchMembers,
        handleSelectMember,
        resetMemberSearch,
        setMemberSearchValue,
    } = useMemberSearch((member) => {
        updateField('member_id', member.id);
    });

    const handleOpenCreateModal = () => {
        resetMemberSearch();
        openCreateModal();
    };
    const handleOpenUpdateModal = (payment: PaymentDTO) => {
        const memberLabel = payment.member
            ? `${payment.member.name} - DNI: ${payment.member.dni}`
            : payment.member_id;
        setMemberSearchValue(memberLabel);
        openUpdateModal(payment);
    };
    const handleOpenDeleteModal = (payment: PaymentDTO) => {
        openCancelPaymentDialog(payment);
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Pagado':
                return {
                    bg: 'green.50',
                    color: 'green.700',
                };

            case 'Vencido':
                return {
                    bg: 'red.50',
                    color: 'red.700',
                };

            case 'Cancelado':
                return {
                    bg: 'gray.50',
                    color: 'gray.700',
                };

            case 'Pendiente':
            default:
                return {
                    bg: 'orange.50',
                    color: 'orange.700',
                };
        }
    };

    return (
        <DialogRoot
            open={isDialogOpen}
            onOpenChange={(e) => setIsDialogOpen(e.open)}
        >
            <Stack gap="8">
                <Flex justify="space-between" align="center">
                    <Stack gap="1">
                        <Heading size="2xl" fontWeight="bold">
                            Administración de Pagos
                        </Heading>

                        <Text color="fg.muted" fontSize="md">
                            Gestiona los pagos de los integrantes de Alentapp.
                        </Text>
                    </Stack>

                    <HStack gap="3">
                        <Button
                            variant="outline"
                            onClick={fetchPayments}
                            disabled={isLoading}
                        >
                            <LuRefreshCw /> Actualizar
                        </Button>

                        <Button
                            colorPalette="blue"
                            size="md"
                            onClick={handleOpenCreateModal}
                        >
                            <LuPlus /> Agregar Pago
                        </Button>
                    </HStack>
                </Flex>

                <PaymentFormDialog
                    mode={formMode}
                    formData={formData}
                    isSubmitting={isSubmitting}
                    memberSearch={memberSearch}
                    memberResults={memberResults}
                    memberSearchRef={memberSearchRef}
                    onSubmit={submitPayment}
                    onUpdateField={updateField}
                    onUpdateMonth={updateMonth}
                    onUpdateYear={updateYear}
                    onSearchMember={searchMembers}
                    onSelectMember={handleSelectMember}
                />

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
                                <Text color="fg.muted">Cargando pagos...</Text>
                            </Stack>
                        </Center>
                    ) : paymentList.length === 0 ? (
                        <Center h="300px">
                            <Stack align="center" gap="4">
                                <Text color="fg.muted">
                                    No se encontraron pagos.
                                </Text>

                                <Button variant="ghost" onClick={fetchPayments}>
                                    Reintentar
                                </Button>
                            </Stack>
                        </Center>
                    ) : (
                        <Table.Root size="md" variant="line" interactive>
                            <Table.Header>
                                <Table.Row bg="bg.muted/50">
                                    <Table.ColumnHeader py="4">
                                        Nombre del socio
                                    </Table.ColumnHeader>

                                    <Table.ColumnHeader py="4">
                                        DNI
                                    </Table.ColumnHeader>

                                    <Table.ColumnHeader py="4">
                                        Monto
                                    </Table.ColumnHeader>

                                    <Table.ColumnHeader py="4">
                                        Período
                                    </Table.ColumnHeader>

                                    <Table.ColumnHeader py="4">
                                        Vencimiento
                                    </Table.ColumnHeader>

                                    <Table.ColumnHeader py="4">
                                        Fecha de Pago
                                    </Table.ColumnHeader>

                                    <Table.ColumnHeader py="4">
                                        Estado
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader py="4">
                                        Acciones
                                    </Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>

                            <Table.Body>
                                {paymentList.map((payment) => {
                                    const statusStyles = getStatusStyles(
                                        payment.status,
                                    );

                                    return (
                                        <Table.Row
                                            key={payment.id}
                                            _hover={{ bg: 'bg.muted/30' }}
                                        >
                                            <Table.Cell
                                                fontWeight="semibold"
                                                color="fg.emphasized"
                                            >
                                                {payment.member?.name || 'N/A'}
                                            </Table.Cell>

                                            <Table.Cell
                                                fontWeight="semibold"
                                                color="fg.emphasized"
                                            >
                                                {payment.member?.dni || 'N/A'}
                                            </Table.Cell>

                                            <Table.Cell
                                                fontWeight="semibold"
                                                color="fg.emphasized"
                                            >
                                                {formatCurrency(payment.amount)}
                                            </Table.Cell>

                                            <Table.Cell color="fg.muted">
                                                {payment.month}/{payment.year}
                                            </Table.Cell>

                                            <Table.Cell color="fg.muted">
                                                {formatDate(payment.due_date)}
                                            </Table.Cell>

                                            <Table.Cell color="fg.muted">
                                                {formatDate(
                                                    payment.payment_date,
                                                )}
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
                                                    {payment.status}
                                                </Box>
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
                                                        aria-label="Editar miembro"
                                                        onClick={() =>
                                                            handleOpenUpdateModal(
                                                                payment,
                                                            )
                                                        }
                                                        disabled={
                                                            payment.status ===
                                                                'Pagado' ||
                                                            payment.status ===
                                                                'Cancelado'
                                                        }
                                                    >
                                                        {' '}
                                                        <LuPencil />
                                                    </IconButton>
                                                    <IconButton
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        colorPalette="red"
                                                        aria-label="Cancelar pago"
                                                        onClick={() =>
                                                            handleOpenDeleteModal(
                                                                payment,
                                                            )
                                                        }
                                                        disabled={
                                                            payment.status ===
                                                            'Cancelado'
                                                        }
                                                    >
                                                        {' '}
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
                <DialogRoot
                    open={!!paymentToCancel}
                    onOpenChange={(details) => {
                        if (!details.open) {
                            closeCancelPaymentDialog();
                        }
                    }}
                >
                    <ConfirmActionDialog
                        title="Cancelar pago"
                        description="Esta acción es destructiva y no tiene vuelta atrás. El pago no será eliminado físicamente, pero quedará marcado como Cancelado en el historial financiero del socio."
                        confirmLabel="Sí, cancelar pago"
                        cancelLabel="Volver"
                        variant="danger"
                        isLoading={isCancellingPayment}
                        error={cancelError}
                        onConfirm={cancelPayment}
                    >
                        {paymentToCancel && (
                            <>
                                <Text>
                                    Vas a cancelar el pago correspondiente al
                                    período{' '}
                                    <strong>
                                        {paymentToCancel.month}/
                                        {paymentToCancel.year}
                                    </strong>
                                    .
                                </Text>

                                <Text mt="1">
                                    Monto:{' '}
                                    <strong>
                                        {formatCurrency(paymentToCancel.amount)}
                                    </strong>
                                </Text>

                                {paymentToCancel.status === 'Pagado' && (
                                    <Text mt="2">
                                        Este pago figura como{' '}
                                        <strong>Pagado</strong>. Al cancelarlo,
                                        se limpiará la fecha de pago y quedará
                                        como <strong>Cancelado</strong>.
                                    </Text>
                                )}
                            </>
                        )}
                    </ConfirmActionDialog>
                </DialogRoot>
            </Stack>
        </DialogRoot>
    );
}
