-- Esse arquivo só roda em bancos vazios. O CarregadorInicial.java é quem realmente
-- popula os dados via JPA; este SQL fica como referência/alternativa.
--
-- Usuarios
INSERT INTO usuario (id, nome, papel) VALUES (1, 'Garcom1', 'GARCOM');
INSERT INTO usuario (id, nome, papel) VALUES (2, 'Cozinha1', 'COZINHA');
INSERT INTO usuario (id, nome, papel) VALUES (3, 'Balcao1', 'BALCAO');
INSERT INTO usuario (id, nome, papel) VALUES (4, 'Gerente1', 'GERENTE');

-- Produtos
INSERT INTO produto (id, nome, preco, quantidade) VALUES (1, 'X-Salada', 12.50, 20);
INSERT INTO produto (id, nome, preco, quantidade) VALUES (2, 'X-Burguer', 10.00, 20);
INSERT INTO produto (id, nome, preco, quantidade) VALUES (3, 'Batata Frita', 8.00, 30);
INSERT INTO produto (id, nome, preco, quantidade) VALUES (4, 'Refrigerante Lata', 5.00, 50);
