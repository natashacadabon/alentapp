import { Box, Input, Text } from '@chakra-ui/react';
import type { MemberDTO } from '@alentapp/shared';

type Props = {
    value: string;
    results: MemberDTO[];
    searchRef: React.RefObject<HTMLDivElement | null>;
    onSearch: (value: string) => void;
    onSelect: (member: MemberDTO) => void;
    updateMode?: boolean;
    required?: boolean;
    disabled?: boolean;
};

export function MemberSearchInput({
    value,
    results,
    searchRef,
    onSearch,
    onSelect,
    updateMode,
    required = !updateMode,
    disabled = updateMode,
}: Props) {
    return (
        <Box position="relative" w="100%" ref={searchRef}>
            <Input
                placeholder="Buscar por nombre o DNI"
                value={value}
                onChange={(e) => onSearch(e.target.value)}
                required={required}
                disabled={disabled}
            />

            {!disabled && results.length > 0 && (
                <Box
                    position="absolute"
                    top="100%"
                    left="0"
                    right="0"
                    zIndex="20"
                    bg="white"
                    borderWidth="1px"
                    borderColor="gray.200"
                    borderRadius="md"
                    mt="1"
                    maxH="220px"
                    overflowY="auto"
                    boxShadow="lg"
                >
                    {results.map((member) => (
                        <Box
                            key={member.id}
                            px="4"
                            py="3"
                            cursor="pointer"
                            _hover={{ bg: 'gray.50' }}
                            onMouseDown={() => onSelect(member)}
                        >
                            <Text fontWeight="semibold">{member.name}</Text>
                            <Text fontSize="sm" color="fg.muted">
                                DNI: {member.dni}
                            </Text>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}