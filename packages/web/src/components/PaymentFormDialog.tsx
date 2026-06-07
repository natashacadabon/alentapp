import {
    Box,
    Button,
    Input,
    SimpleGrid,
    Stack,
    Text,
    NativeSelect,
} from '@chakra-ui/react';
import type { CreatePaymentRequest, PaymentStatus } from '@alentapp/shared';
import {
    DialogActionTrigger,
    DialogBody,
    DialogCloseTrigger,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Field } from './ui/field';
import { MemberSearchInput } from './MemberSearchInput';
import type { MemberDTO } from '@alentapp/shared';

type PaymentFormMode = 'create' | 'update';

type PaymentFormData = CreatePaymentRequest & {
    status?: PaymentStatus;
    payment_date?: string | null;
};

type Props = {
    mode?: PaymentFormMode;
    formData: PaymentFormData;
    isSubmitting: boolean;

    memberSearch: string;
    memberResults: MemberDTO[];
    memberSearchRef: React.RefObject<HTMLDivElement | null>;

    onSubmit: (event: React.FormEvent) => void;
   onUpdateField: <K extends keyof PaymentFormData>(
    field: K,
    value: PaymentFormData[K],
) => void;
    onUpdateMonth: (value: string) => void;
    onUpdateYear: (value: string) => void;
    onSearchMember: (value: string) => void;
    onSelectMember: (member: MemberDTO) => void;
};

export function PaymentFormDialog({
    mode = 'create',
    formData,
    isSubmitting,
    memberSearch,
    memberResults,
    memberSearchRef,
    onSubmit,
    onUpdateField,
    onUpdateMonth,
    onUpdateYear,
    onSearchMember,
    onSelectMember,
}: Props) {
    const isUpdateMode = mode === 'update';

    return (
        <DialogContent>
            <form onSubmit={onSubmit}>
                <DialogHeader>
                    <DialogTitle>
                        {isUpdateMode
                            ? 'Actualizar Pago'
                            : 'Agregar Nuevo Pago'}
                    </DialogTitle>
                </DialogHeader>

                <DialogBody>
                    <Stack gap="4">
                        <Field label="Socio" required={!isUpdateMode}>
                            <MemberSearchInput
                                value={memberSearch}
                                results={memberResults}
                                searchRef={memberSearchRef}
                                onSearch={onSearchMember}
                                onSelect={onSelectMember}
                                updateMode={isUpdateMode}
                            />
                        </Field>

                        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                            <Field label="Mes" required={!isUpdateMode}>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.month}
                                    onChange={(e) =>
                                        onUpdateMonth(e.target.value)
                                    }
                                    required={!isUpdateMode}
                                    disabled={isUpdateMode}
                                />
                            </Field>

                            <Field label="Año" required={!isUpdateMode}>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.year}
                                    onChange={(e) =>
                                        onUpdateYear(e.target.value)
                                    }
                                    required={!isUpdateMode}
                                    disabled={isUpdateMode}
                                />
                            </Field>
                        </SimpleGrid>

                        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                            <Field label="Monto" required={!isUpdateMode}>
                                <Box position="relative">
                                    <Text
                                        position="absolute"
                                        left="3"
                                        top="50%"
                                        transform="translateY(-50%)"
                                        color="fg.muted"
                                        pointerEvents="none"
                                    >
                                        $
                                    </Text>

                                    <Input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0"
                                        value={formData.amount}
                                        pl="7"
                                        onChange={(e) =>
                                            onUpdateField(
                                                'amount',
                                                Number(e.target.value),
                                            )
                                        }
                                        disabled={isUpdateMode}
                                        required={!isUpdateMode}
                                    />
                                </Box>
                            </Field>

                            <Field label="Fecha de Vencimiento" required={!isUpdateMode}>
                                <Input
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) =>
                                        onUpdateField(
                                            'due_date',
                                            e.target.value,
                                        )
                                    }
                                    required={!isUpdateMode}
                                    disabled={isUpdateMode}
                                />
                            </Field>
                        </SimpleGrid>
                        {isUpdateMode && (
                            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                                <Field label="Estado" >
                                    <NativeSelect.Root>
                                        <NativeSelect.Field
                                            value={formData.status ?? ''}
                                            onChange={(e) =>
                                                onUpdateField(
                                                    'status',
                                                    e.target
                                                        .value as PaymentStatus,
                                                )
                                            }
                                        >
                                            <option value="" disabled>
                                                Seleccionar Estado
                                            </option>
                                            <option value="Pendiente">
                                                Pendiente
                                            </option>
                                            <option value="Pagado">
                                                Pagado
                                            </option>
                                            <option value="Vencido">
                                                Vencido
                                            </option>
                                    
                                        </NativeSelect.Field>
                                        <NativeSelect.Indicator/>
                                    </NativeSelect.Root>
                                </Field>
                                {formData.status === 'Pagado' && (
                                    <Field label="Fecha de Pago">
                                        <Input
                                            type="date"
                                            value={formData.payment_date ?? ''}
                                            onChange={(e) =>
                                                onUpdateField(
                                                    'payment_date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                )}
                            </SimpleGrid>
                        )}
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
                        {isUpdateMode ? 'Actualizar Pago' : 'Crear Pago'}
                    </Button>
                </DialogFooter>

                <DialogCloseTrigger />
            </form>
        </DialogContent>
    );
}
