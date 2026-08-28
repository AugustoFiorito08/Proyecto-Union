using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProyectoUnion.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSociosGruposFamiliaresConfiguracion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categorias",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ValorCuota = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categorias", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CoberturasMedicas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoberturasMedicas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Planes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CoberturaMedicaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Planes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Planes_CoberturasMedicas_CoberturaMedicaId",
                        column: x => x.CoberturaMedicaId,
                        principalTable: "CoberturasMedicas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "GruposFamiliares",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    NumeroGrupo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    TitularSocioId = table.Column<Guid>(type: "uuid", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    Observaciones = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    MotivoBaja = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FechaBaja = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GruposFamiliares", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Socios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UsuarioId = table.Column<Guid>(type: "uuid", nullable: true),
                    NumeroSocio = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Apellido = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Nombres = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    DNI = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CUIL = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    FechaNacimiento = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Genero = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Nacionalidad = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    TipoPago = table.Column<int>(type: "integer", nullable: false),
                    CategoriaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Telefono = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Celular = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Domicilio = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    Localidad = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    Provincia = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    CodigoPostal = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    CoberturaMedicaId = table.Column<Guid>(type: "uuid", nullable: true),
                    PlanId = table.Column<Guid>(type: "uuid", nullable: true),
                    GrupoSanguineo = table.Column<string>(type: "text", nullable: true),
                    ContactoEmergencia = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ObservacionesMedicas = table.Column<string>(type: "text", nullable: true),
                    FichaMedicaFechaEmision = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FichaMedicaFechaVencimiento = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FotoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    GrupoFamiliarId = table.Column<Guid>(type: "uuid", nullable: true),
                    Parentesco = table.Column<int>(type: "integer", nullable: true),
                    Modalidad = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    FechaAlta = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FechaBaja = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MotivoBaja = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FechaUltimaModificacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CodigoQr = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ConsentimientoDatosSaludFecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Socios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Socios_AspNetUsers_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Socios_Categorias_CategoriaId",
                        column: x => x.CategoriaId,
                        principalTable: "Categorias",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Socios_CoberturasMedicas_CoberturaMedicaId",
                        column: x => x.CoberturaMedicaId,
                        principalTable: "CoberturasMedicas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Socios_GruposFamiliares_GrupoFamiliarId",
                        column: x => x.GrupoFamiliarId,
                        principalTable: "GruposFamiliares",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Socios_Planes_PlanId",
                        column: x => x.PlanId,
                        principalTable: "Planes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Categorias_Nombre",
                table: "Categorias",
                column: "Nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CoberturasMedicas_Nombre",
                table: "CoberturasMedicas",
                column: "Nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GruposFamiliares_NumeroGrupo",
                table: "GruposFamiliares",
                column: "NumeroGrupo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GruposFamiliares_TitularSocioId",
                table: "GruposFamiliares",
                column: "TitularSocioId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Planes_CoberturaMedicaId_Nombre",
                table: "Planes",
                columns: new[] { "CoberturaMedicaId", "Nombre" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Socios_CategoriaId",
                table: "Socios",
                column: "CategoriaId");

            migrationBuilder.CreateIndex(
                name: "IX_Socios_CoberturaMedicaId",
                table: "Socios",
                column: "CoberturaMedicaId");

            migrationBuilder.CreateIndex(
                name: "IX_Socios_CodigoQr",
                table: "Socios",
                column: "CodigoQr",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Socios_DNI",
                table: "Socios",
                column: "DNI",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Socios_Email",
                table: "Socios",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Socios_Estado",
                table: "Socios",
                column: "Estado");

            migrationBuilder.CreateIndex(
                name: "IX_Socios_GrupoFamiliarId",
                table: "Socios",
                column: "GrupoFamiliarId");

            migrationBuilder.CreateIndex(
                name: "IX_Socios_NumeroSocio",
                table: "Socios",
                column: "NumeroSocio",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Socios_PlanId",
                table: "Socios",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_Socios_UsuarioId",
                table: "Socios",
                column: "UsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_GruposFamiliares_Socios_TitularSocioId",
                table: "GruposFamiliares",
                column: "TitularSocioId",
                principalTable: "Socios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GruposFamiliares_Socios_TitularSocioId",
                table: "GruposFamiliares");

            migrationBuilder.DropTable(
                name: "Socios");

            migrationBuilder.DropTable(
                name: "Categorias");

            migrationBuilder.DropTable(
                name: "GruposFamiliares");

            migrationBuilder.DropTable(
                name: "Planes");

            migrationBuilder.DropTable(
                name: "CoberturasMedicas");
        }
    }
}
