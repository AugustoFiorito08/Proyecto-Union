using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProyectoUnion.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddControlAcceso : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ToleranciaAccesoDiasCuotaVencida",
                table: "ConfiguracionesGenerales",
                type: "integer",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.CreateTable(
                name: "RegistrosAcceso",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SocioId = table.Column<Guid>(type: "uuid", nullable: true),
                    FechaHora = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Resultado = table.Column<int>(type: "integer", nullable: false),
                    MotivoDenegacion = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    OperadorUsuarioId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RegistrosAcceso", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RegistrosAcceso_AspNetUsers_OperadorUsuarioId",
                        column: x => x.OperadorUsuarioId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RegistrosAcceso_Socios_SocioId",
                        column: x => x.SocioId,
                        principalTable: "Socios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosAcceso_FechaHora",
                table: "RegistrosAcceso",
                column: "FechaHora");

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosAcceso_OperadorUsuarioId",
                table: "RegistrosAcceso",
                column: "OperadorUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_RegistrosAcceso_SocioId",
                table: "RegistrosAcceso",
                column: "SocioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RegistrosAcceso");

            migrationBuilder.DropColumn(
                name: "ToleranciaAccesoDiasCuotaVencida",
                table: "ConfiguracionesGenerales");
        }
    }
}
